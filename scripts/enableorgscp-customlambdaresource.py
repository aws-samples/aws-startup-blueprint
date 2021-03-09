import boto3
import botocore
import json
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
org = boto3.client('organizations')

# Define action for the creation of a template
def create_endpoint(event, context):

    # Check if the account is part of an Organization.  Only accounts within an Organization can receive a SCP
    try:
        response = org.describe_organization()
        print("Account is member of an existing Organization.")

        try:
            getRootId = org.list_roots()
            rootId = getRootId['Roots'][0]['Id']

            enableSCP = org.enable_policy_type(
                RootId=rootId,
                PolicyType='SERVICE_CONTROL_POLICY'
            )
            print("SCP has been enabled")
            return {
                'statusCode': 200,
                'body': json.dumps('Organization exists & SCP Policy Type is enabled.')
            }
        
        except:
            print("SCP policies are already enabled")
            return {
                'statusCode': 200,
                'body': json.dumps('Organization exists & SCP Policy Type is enabled.')
            }

    except:
        print("Not part of an Organization.  Organization will be created.")

        # Create the Organization based on the current account
        createOrganization = org.create_organization(
            FeatureSet='ALL'
        )
        print("Organization created.")
        print(createOrganization)

        # Enable SCP
        getRootId = org.list_roots()
        rootId = getRootId['Roots'][0]['Id']

        enableSCP = org.enable_policy_type(
            RootId=rootId,
            PolicyType='SERVICE_CONTROL_POLICY'
        )
        print("SCP has been enabled")

        return {
            'statusCode': 200,
            'body': json.dumps('Organization exists & SCP Policy Type is enabled.')
        }

# Define action for the template deletion
def delete_endpoint(event, context):
    return {
            'statusCode': 200,
            'body': json.dumps('Organization will not be deleted.')
        }

def main(event, context):
    print("Received event: " + json.dumps(event, indent=2))
  
    logger.info(event)
  
    if event['RequestType'] == 'Delete':
        delete_endpoint(event, context)
    elif event['RequestType'] == 'Create':
        create_endpoint(event, context)
    #print("Completed successfully")




