import boto3
import botocore
import json
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
org = boto3.client('organizations')
iam = boto3.client('iam')

# Set Global Variables
accountNumber = boto3.client('sts').get_caller_identity().get('Account')
sampleRole = 'DiGav-Sample-Role'
sampleInstanceProfile = 'DiGav-Sample-Role'
samplePolicy = "arn:aws:iam::" + accountNumber + ":policy/DiGav-PermissionBoundary-Policy"

# Define action for the creation of a template
def create_endpoint(event, context):

    # Check if the account is part of an Organization.  Only accounts within an Organization can receive a SCP
    try:
        response = org.describe_organization()

        # Import a Service Control Policy (SCP) that allows access to the listed regions
        with open ('DiGavSCP.json') as policyJson:
            policyData = json.load(policyJson)
            policyContent = json.dumps(policyData)

        # Create the SCP
        response = org.create_policy(
            Name='DiGav-Region-Restriction-Policy',
            Type='SERVICE_CONTROL_POLICY',
            Description='Policy to restrict access to certain regions',
            Content=policyContent,
        )
        policyId = response['Policy']['PolicySummary']['Id']
        
        # Attach the SCP
        response = org.attach_policy(
        PolicyId=policyId,
        TargetId=accountNumber,
        )
        print(response)
    except:
        print("Not part of an Organization.  IAM Role and Policy will be created.")

        # Import a Service Control Policy (SCP) that allows access to the listed regions
        with open ('DiGavIAM.json') as policyJson:
            policyData = json.load(policyJson)
            policyContent = json.dumps(policyData)

        with open ('DiGavIAMAssume.json') as assumeJson:
            assumeData = json.load(assumeJson)
            assumeContent = json.dumps(assumeData)

        policy = iam.create_policy(
            PolicyName='DiGav-PermissionBoundary-Policy',
            Description='A policy that restricts access to certain regions, intended to be used as a Permission Boundary.',
            PolicyDocument=policyContent,
        )
        print(policy)
        policyArn = policy['Policy']['Arn']

        role = iam.create_role(
            RoleName='DiGav-Sample-Role',
            Description='A sample role with Administer access and a Permission Boundary that restricts access to certain regions.',
            AssumeRolePolicyDocument=assumeContent,
            PermissionsBoundary=policyArn,
        )
        roleName=role['Role']['RoleName']
        print(role)

        attachPolicy = iam.attach_role_policy(
            RoleName=roleName,
            PolicyArn='arn:aws:iam::aws:policy/AdministratorAccess',
        )

        print("IAM Role and Permission Boundary Policy Created")

# Define action for the template deletion
def delete_endpoint(event, context):
    try:
        response = org.describe_organization()

        # Delete SCP
        policy = org.list_policies(
            Filter='SERVICE_CONTROL_POLICY'
        )
        for p in policy['Policies']:
            policyNames = p['Name']
            if policyNames == "DiGav-Region-Restriction-Policy":
                policyId = p['Id']
                print(policyId)

                # Detach policy in current account
                detachPolicy = org.detach_policy(
                    PolicyId=policyId,
                    TargetId=accountNumber,
                )
                print(detachPolicy)

                # # Delete policy
                deletePolicy = org.delete_policy(
                    PolicyId=policyId
                )
                print("DiGav Sample Policy Deleted")

    except:

        # Detach all policies from Sample Role
        attachedPolicies = iam.list_attached_role_policies(
            RoleName=sampleRole
        )
        for policy in attachedPolicies['AttachedPolicies']:
            policyArn = policy['PolicyArn']

            detachPolicy = iam.detach_role_policy(
                RoleName=sampleRole,
                PolicyArn=policyArn
            )
            detachPermissionsBoundary = iam.delete_role_permissions_boundary(
                RoleName=sampleRole
            )
            print(policy['PolicyName']+" has been detached")

        # Delete Role & Permissions Boundary Policy
        removeInstanceProfileRole = iam.remove_role_from_instance_profile(
            InstanceProfileName=sampleInstanceProfile,
            RoleName=sampleRole
        )

        deleteInstanceProfiles = iam.delete_instance_profile(
            InstanceProfileName=sampleInstanceProfile
        )
        
        deleteRole = iam.delete_role(
            RoleName=sampleRole
        )
        print("Sample Role deleted")

        deletePolicy = iam.delete_policy(
            PolicyArn=samplePolicy
        )
        print("Sample Policy Deleted")

def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
  
    logger.info(event)
  
    if event['RequestType'] == 'Delete':
        delete_endpoint(event, context)
    elif event['RequestType'] == 'Create':
        create_endpoint(event, context)
    #print("Completed successfully")




