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
        logger.info("Account is member of an existing Organization.")

    except:
        print("Not part of an Organization.  Organization will be created.")
        
        try: 
            try: 
                # Create the Organization based on the current account
                createOrganization = org.create_organization(
                    FeatureSet='ALL'
                )
                
                logger.info("Organization created.")
                logger.info(createOrganization)
                
            except org.exceptions.AlreadyInOrganizationException as err:
                logger.info("Already in an org.")
                
            try: 
                org.enable_all_features()
                logger.info("Features enabled.")
            except org.exceptions.HandshakeConstraintViolationException as err:
                logger.info("Features already enabled.")
                
        except Exception as err:
            return err

    finally:
        
        try: 
            getRootId = org.list_roots()
            rootId = getRootId['Roots'][0]['Id']
    
            enableSCP = org.enable_policy_type(
                RootId=rootId,
                PolicyType='SERVICE_CONTROL_POLICY'
            )
            print(enableSCP)
    
            return {
                'statusCode': 200,
                'body': json.dumps('Organization exists & SCP Policy Type is enabled.')
            }
        except org.exceptions.PolicyTypeAlreadyEnabledException as err:
            return {
                'statusCode': 200,
                'body': json.dumps('Organization exists & SCP Policy Type is already enabled.')
            }
        except Exception as err: 
            print(err)
            return err
        
            

def main(event, context):
    print("Received event: " + json.dumps(event, indent=2))
  
    logger.info(event)
  
  
    if event['RequestType'] == 'Delete':
        return {} #noop
    elif event['RequestType'] == 'Create':
        return create_endpoint(event, context)
    elif event['RequestType'] == 'Update':
        return {} #noop
    #print("Completed successfully")




