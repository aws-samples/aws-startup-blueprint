import boto3
import botocore
import json
import logging
import cfnresponse
logger = logging.getLogger()
logger.setLevel(logging.INFO)
org = boto3.client('organizations')
iam = boto3.client('iam')

# Set Global Variables
accountNumber = boto3.client('sts').get_caller_identity().get('Account')
policyName = "DiGav-Region-Restriction-Policy"

# Define action for the creation of a template
def create_endpoint(event, context):

    policyContent = event['ResourceProperties']['PolicyContentInput']

    # Create the SCP
    response = org.create_policy(
        Name=policyName,
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
    responseData['response'] = response
    responseData['statusMessage'] = 'SCP Created and Attached'
    cfnresponse.send(event, context, cfnresponse.SUCCESS, responseData)
    return
    
def delete_endpoint(event, context):
    
    # Delete SCP
    policy = org.list_policies(
        Filter='SERVICE_CONTROL_POLICY'
    )
    for p in policy['Policies']:
        policyNames = p['Name']
        if policyNames == policyName:
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
            responseData['response'] = deletePolicy
            responseData['statusMessage'] = 'SCP Deleted'
            cfnresponse.send(event, context, cfnresponse.SUCCESS, responseData)
            return

def main(event, context):
    print("Received event: " + json.dumps(event, indent=2))
  
    logger.info(event)
  
    if event['RequestType'] == 'Delete':
        delete_endpoint(event, context)
    elif event['RequestType'] == 'Create':
        create_endpoint(event, context)
    #print("Completed successfully")




