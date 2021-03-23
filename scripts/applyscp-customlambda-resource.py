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
def create_scp(event, context):

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
    
    
    return { 'PhysicalResourceId': policyId }
    
def delete_scp(event, context):
    
    policyId = event["PhysicalResourceId"]
    
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
        return delete_scp(event, context)
    elif event['RequestType'] == 'Create':
        return create_scp(event, context)
    elif event['RequestType'] == 'Update':
        delete_scp(event, context)
        return create_scp(event, context)        
    #print("Completed successfully")




