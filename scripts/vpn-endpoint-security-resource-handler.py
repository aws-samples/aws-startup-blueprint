import subprocess
import os
import sys
import boto3
import logging
import json
import traceback
ec2=boto3.client('ec2')
ssm=boto3.client('ssm')
acm = boto3.client('acm')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

responseData = {}

def deleteCert(event, context, isUpdate=False):
  
  try: 
    responseData['Complete'] = 'True'
    certificateID = event['PhysicalResourceId']
    vpnConfigBucket = event['ResourceProperties']['VpnConfigBucket']

    deleteClientCmd = ['aws s3 rm {0}ca.crt'.format(vpnConfigBucket),
                    'aws s3 rm {0}server.crt'.format(vpnConfigBucket),
                    'aws s3 rm {0}server.key'.format(vpnConfigBucket),
                    'aws s3 rm {0}client1.domain.tld.crt'.format(vpnConfigBucket),
                    'aws s3 rm {0}client1.domain.tld.key'.format(vpnConfigBucket)]

    result = runCommandSet(deleteClientCmd)  

    acm.delete_certificate(CertificateArn=certificateID)

    if(isUpdate == False):
      return { 'PhysicalResourceId': certificateID, 'responseData': responseData  }

  except Exception as e:
      logger.error(e)
      errorMessage = e.args[0]
      response_data = {'ErrorMessage': errorMessage}
      return False
  

def createCert(event, context):
  
  try: 

      logger.info("Starting to create certificate")

      vpnConfigBucket = event['ResourceProperties']['VpnConfigBucket']

      installEasyRSACommands = ['curl -L https://github.com/OpenVPN/easy-rsa/releases/download/v3.0.6/EasyRSA-unix-v3.0.6.tgz -O',
                            'mkdir /tmp/easyrsa',
                            'mkdir /tmp/vpndetails',
                            'tar -xvzf /tmp/EasyRSA-unix-v3.0.6.tgz -C /tmp/easyrsa',
                            'ls /tmp/easyrsa']
      runCommandSet(installEasyRSACommands)
            
      easyRsaCommands = [ '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa init-pki',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-ca nopass',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-server-full server nopass',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-client-full client1.domain.tld nopass',
                          'cp /tmp/pki/ca.crt /tmp/vpndetails/ca.crt',
                          'cp /tmp/pki/issued/server.crt /tmp/vpndetails/server.crt',
                          'cp /tmp/pki/private/server.key /tmp/vpndetails/server.key',
                          'cp /tmp/pki/issued/client1.domain.tld.crt /tmp/vpndetails/client1.domain.tld.crt',
                          'cp /tmp/pki/private/client1.domain.tld.key /tmp/vpndetails/client1.domain.tld.key',
                          ]
      runCommandSet(easyRsaCommands, '/tmp/easy-rsa/EasyRSA-v3.0.6')
      
      serverCertResponse = acm.import_certificate(
          Certificate=get_bytes_from_file('/tmp/vpndetails/server.crt'),
          PrivateKey=get_bytes_from_file('/tmp/vpndetails/server.key'),
          CertificateChain=get_bytes_from_file('/tmp/vpndetails/ca.crt')
      )
      
      logger.info(serverCertResponse)

      downloadAndCopyConfigKeysAndCert = ['aws s3 cp /tmp/vpndetails/ca.crt {0}ca.crt'.format(vpnConfigBucket),
                                          'aws s3 cp /tmp/vpndetails/server.crt {0}server.crt'.format(vpnConfigBucket),
                                          'aws s3 cp /tmp/vpndetails/server.key {0}server.key'.format(vpnConfigBucket),
                                          'aws s3 cp /tmp/vpndetails/client1.domain.tld.crt {0}client1.domain.tld.crt'.format(vpnConfigBucket),
                                          'aws s3 cp /tmp/vpndetails/client1.domain.tld.key {0}client1.domain.tld.key'.format(vpnConfigBucket)
                                          ]
      runCommandSet(downloadAndCopyConfigKeysAndCert);


      return {
        'responseData': responseData,
        'PhysicalResourceId': serverCertResponse['CertificateArn'],
      } 
      
  except Exception as e:
      logger.error(e)
      response_data = {'ErrorMessage': e}
      return response_data
  					
def runCommandSet(commands, workDir='/tmp/'):
              
  my_env = os.environ.copy()
  my_env["PATH"] = "/tmp/bin:" + my_env["PATH"]
  my_env["PYTHONPATH"] = "/tmp/:"
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

def main(event, context):
  
  logger.info(event)
  
  installDepCommands = ['pip3 install awscli --upgrade --no-cache-dir --ignore-installed --target=/tmp/']
  runCommandSet(installDepCommands)

  if event['RequestType'] == 'Delete':
    return deleteCert(event, context)
  elif event['RequestType'] == 'Create':
    return createCert(event, context)
  elif event['RequestType'] == 'Update':
    deleteCert(event, context, True)
    return createCert(event, context)    