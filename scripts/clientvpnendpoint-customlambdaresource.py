import subprocess
import os
import sys
import boto3
import logging
import json
from botocore.vendored import requests
import traceback
ec2=boto3.client('ec2')
ssm=boto3.client('ssm')
acm = boto3.client('acm')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def delete_endpoint(event, context):
  
  try: 
      paramStorePath = event['ResourceProperties']['ParamStorePath']  

      clientVpnEndpoint = ssm.get_parameter(Name=paramStorePath, WithDecryption=False)['Parameter']['Value']  
      associationId = ssm.get_parameter(Name=paramStorePath+"AssociationID", WithDecryption=False)['Parameter']['Value']  
      vpnConfigBucket = event['ResourceProperties']['VpnConfigBucket']
      
      deleteClientCmd = ['aws s3 rm s3://{0}/PreclinicalVPN.ovpn'.format(vpnConfigBucket),
                         'aws s3 rm s3://{0}/client1.domain.tld.crt'.format(vpnConfigBucket),
                         'aws s3 rm s3://{0}/client1.domain.tld.key'.format(vpnConfigBucket),
                         'aws ec2 disassociate-client-vpn-target-network --client-vpn-endpoint-id {0} --association-id {1}'.format(clientVpnEndpoint,associationId),
                         'aws ec2 delete-client-vpn-endpoint --client-vpn-endpoint-id {0}'.format(clientVpnEndpoint)]
      result = runCommandSet(deleteClientCmd)  
      response_data={}
      send(event, context, SUCCESS, response_data)
  except Exception as e:
      logger.error(e)
      errorMessage = e.args[0]
      response_data = {'ErrorMessage': errorMessage}
      send(event, context, FAILED, response_data)
  

def create_endpoint(event, context):
  
  try: 
      subnetToAssociate = event['ResourceProperties']['SubnetToAssociate']
      targetNetworkCidr = event['ResourceProperties']['TargetNetworkCidr']
      logGroup = event['ResourceProperties']['LogGroup']
      logStream = event['ResourceProperties']['LogStream']
      clientCidr = event['ResourceProperties']['ClientCidr']
      paramStorePath = event['ResourceProperties']['ParamStorePath']
      vpnConfigBucket = event['ResourceProperties']['VpnConfigBucket']
      vpcId = event['ResourceProperties']['VpcId']
      vpcSecurityGroup = event['ResourceProperties']['VpcSecurityGroup']

  
      installEasyRSACommands = ['curl -L https://github.com/OpenVPN/easy-rsa/releases/download/v3.0.6/EasyRSA-unix-v3.0.6.tgz -O',
                            'mkdir /tmp/easyrsa',
                            'mkdir /tmp/vpndetails',
                            'tar -xvzf /tmp/EasyRSA-unix-v3.0.6.tgz -C /tmp/easyrsa',
                            'ls /tmp/easyrsa']
      runCommandSet(installEasyRSACommands)
      
      
      easyRsaCommands = [ '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa init-pki',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa init-pki',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-ca nopass',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-server-full server nopass',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-client-full client1.domain.tld nopass',
                          'cp /tmp/pki/ca.crt /tmp/vpndetails/',
                          'cp /tmp/pki/issued/server.crt /tmp/vpndetails/server.crt',
                          'cp /tmp/pki/private/server.key /tmp/vpndetails/server.key',
                          'cp /tmp/pki/issued/client1.domain.tld.crt /tmp/vpndetails/client1.domain.tld.crt',
                          'cp /tmp/pki/private/client1.domain.tld.key /tmp/vpndetails/client1.domain.tld.key']
      runCommandSet(easyRsaCommands, '/tmp/easy-rsa/EasyRSA-v3.0.6')
      
      
      
      serverCertResponse = acm.import_certificate(
          Certificate=get_bytes_from_file('/tmp/vpndetails/server.crt'),
          PrivateKey=get_bytes_from_file('/tmp/vpndetails/server.key'),
          CertificateChain=get_bytes_from_file('/tmp/vpndetails/ca.crt')
      )
      
      clientCertResponse = acm.import_certificate(
          Certificate=get_bytes_from_file('/tmp/vpndetails/client1.domain.tld.crt'),
          PrivateKey=get_bytes_from_file('/tmp/vpndetails/client1.domain.tld.key'),
          CertificateChain=get_bytes_from_file('/tmp/vpndetails/ca.crt')
      )
      
      createClientCmd = ['aws ec2 create-client-vpn-endpoint --client-cidr-block {0} --server-certificate-arn {1} --authentication-options Type=certificate-authentication,MutualAuthentication={{ClientRootCertificateChainArn={2}}} --connection-log-options Enabled=True,CloudwatchLogGroup={3},CloudwatchLogStream={4}'.format(
                          clientCidr,serverCertResponse['CertificateArn'], clientCertResponse['CertificateArn'], logGroup, logStream)]
      endpointResponseRaw = runCommandSet(createClientCmd)
      
      endpointResponse = json.loads(endpointResponseRaw[0])
      
      clientVpnEndpointId = endpointResponse['ClientVpnEndpointId']
      
      param_response = ssm.put_parameter(
          Name=paramStorePath,
          Description='Biotech Blueprint VPC Client VPN Endpoint ID.',
          Type='String',
          Value=clientVpnEndpointId,
          Overwrite=True
      )
      
      associateClientVPN = ['aws ec2 associate-client-vpn-target-network --client-vpn-endpoint-id {0} --subnet-id {1}'.format(clientVpnEndpointId,subnetToAssociate),
                            'aws ec2 create-client-vpn-route --client-vpn-endpoint-id {0} --destination-cidr-block 0.0.0.0/0 --target-vpc-subnet-id {1}'.format(clientVpnEndpointId,subnetToAssociate),
                            'aws ec2 authorize-client-vpn-ingress --client-vpn-endpoint-id {0} --target-network-cidr {1} --authorize-all-groups'.format(clientVpnEndpointId,targetNetworkCidr),
                            'aws ec2 apply-security-groups-to-client-vpn-target-network --client-vpn-endpoint-id {0} --vpc-id {1} --security-group-ids {2}'.format(clientVpnEndpointId,vpcId,vpcSecurityGroup)]

      associationResponseRaw = runCommandSet(associateClientVPN)
      associationResponse = json.loads(associationResponseRaw[0])
      associationID = associationResponse['AssociationId']
      
      param_response = ssm.put_parameter(
          Name=paramStorePath+"AssociationID",
          Description='Biotech Blueprint VPC Client VPN Endpoint ID Association ID.',
          Type='String',
          Value=associationID,
          Overwrite=True
      )
      
      downloadVpnConfig = ['aws ec2 export-client-vpn-client-configuration --client-vpn-endpoint-id {0}'.format(clientVpnEndpointId)]
      downloadConfigResponseRaw = runCommandSet(downloadVpnConfig)
      downloadConfigResponse = json.loads(downloadConfigResponseRaw[0])
      configText = downloadConfigResponse['ClientConfiguration']
      configText += "\nkey client1.domain.tld.key"
      configText += "\ncert client1.domain.tld.crt"
      
      logger.info(configText)
      
      with open("/tmp/vpndetails/openvpnclientconfig.ovpn", "w") as confFile:
        confFile.write(configText)
      
      downloadAndCopyConfigKeysAndCert = ['aws ec2 export-client-vpn-client-configuration --client-vpn-endpoint-id {0}'.format(clientVpnEndpointId),
                                          'aws s3 cp /tmp/vpndetails/openvpnclientconfig.ovpn s3://{0}/PreclinicalVPN.ovpn'.format(vpnConfigBucket),
                                          'aws s3 cp /tmp/vpndetails/client1.domain.tld.crt s3://{0}/client1.domain.tld.crt'.format(vpnConfigBucket),
                                          'aws s3 cp /tmp/vpndetails/client1.domain.tld.key s3://{0}/client1.domain.tld.key'.format(vpnConfigBucket)
                                          ]
      runCommandSet(downloadAndCopyConfigKeysAndCert)
      response_data = {
          'ClientVpnEndpointId': endpointResponse['ClientVpnEndpointId'],
          'DnsName': endpointResponse['DnsName']
      }
      
      send(event, context, SUCCESS, response_data)
      
      
  except Exception as e:
      logger.error(e)
      response_data = {'ErrorMessage': e}
      send(event, context, FAILED, response_data)
 
  					
def runCommandSet(commands, workDir='/tmp/'):
              
  my_env = os.environ.copy()
  my_env["PATH"] = "/tmp/bin:" + my_env["PATH"]
  my_env["PYTHONPATH"] = "/tmp/:" + my_env["PYTHONPATH"]                
  my_env["EASYRSA_BATCH"] = "1"      

  stdOutResponse = []                
  for command in commands:
      commandHandle = subprocess.Popen([command],env=my_env,cwd='/tmp/', shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
      stdout, stderr = commandHandle.communicate()
      logger.info(command)
      logger.info(stdout)
      logger.info(stderr)
      stdOutResponse.append(stdout)
          
  return stdOutResponse

def get_bytes_from_file(filename):  
  return open(filename, "rb").read()      

SUCCESS = "SUCCESS"
FAILED = "FAILED"

def send(event, context, responseStatus, responseData, physicalResourceId=None, noEcho=False):
    responseUrl = event['ResponseURL']

    responseBody = {}
    responseBody['Status'] = responseStatus
    responseBody['Reason'] = 'See the details in CloudWatch Log Stream: ' + context.log_stream_name
    responseBody['PhysicalResourceId'] = physicalResourceId or context.log_stream_name
    responseBody['StackId'] = event['StackId']
    responseBody['RequestId'] = event['RequestId']
    responseBody['LogicalResourceId'] = event['LogicalResourceId']
    responseBody['NoEcho'] = noEcho
    responseBody['Data'] = responseData

    json_responseBody = json.dumps(responseBody)

    headers = {
        'content-type' : '',
        'content-length' : str(len(json_responseBody))
    }

    try:
        response = requests.put(responseUrl,
                                data=json_responseBody,
                                headers=headers)
    except Exception as e:
        error = e
  
def lambda_handler(event, context):
  
  logger.info(event)
  
  installDepCommands = ['pip3 install pip awscli --upgrade --no-cache-dir --ignore-installed --target=/tmp/']
  runCommandSet(installDepCommands)
  
  if event['RequestType'] == 'Delete':
    delete_endpoint(event, context)
  elif event['RequestType'] == 'Create':
    create_endpoint(event, context)
  #print("Completed successfully")
  
  