Q=True
P='/tmp/'
O='ErrorMessage'
N='VpnConfigBucket'
M='ResourceProperties'
L=False
K=Exception
import subprocess as D
import os
import sys
import boto3 as E
import logging as G
import json
import cfnresponse
from botocore.vendored import requests
import traceback
R=E.client('ec2')
S=E.client('ssm')
H=E.client('acm')
B=G.getLogger()
B.setLevel(G.INFO)
A={}
def I(event,context,isUpdate=L):
	F=context;E=event
	try:
		A['Complete']='True';G=E['PhysicalResourceId'];D=E[M][N];J=['aws s3 rm {0}ca.crt'.format(D),'aws s3 rm {0}server.crt'.format(D),'aws s3 rm {0}server.key'.format(D),'aws s3 rm {0}client1.domain.tld.crt'.format(D),'aws s3 rm {0}client1.domain.tld.key'.format(D)];Q=C(J);H.delete_certificate(CertificateArn=G)
		if isUpdate==L:cfnresponse.send(E,F,cfnresponse.SUCCESS,A,G)
	except K as I:B.error(I);P=I.args[0];R={O:P};cfnresponse.send(E,F,cfnresponse.FAILED,A)
def J(event,context):
	G=context;E=event
	try:D=E[M][N];J=['curl -L https://github.com/OpenVPN/easy-rsa/releases/download/v3.0.6/EasyRSA-unix-v3.0.6.tgz -O','mkdir /tmp/easyrsa','mkdir /tmp/vpndetails','tar -xvzf /tmp/EasyRSA-unix-v3.0.6.tgz -C /tmp/easyrsa','ls /tmp/easyrsa'];C(J);L=['/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa init-pki','/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-ca nopass','/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-server-full server nopass','/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-client-full client1.domain.tld nopass','cp /tmp/pki/ca.crt /tmp/vpndetails/ca.crt','cp /tmp/pki/issued/server.crt /tmp/vpndetails/server.crt','cp /tmp/pki/private/server.key /tmp/vpndetails/server.key','cp /tmp/pki/issued/client1.domain.tld.crt /tmp/vpndetails/client1.domain.tld.crt','cp /tmp/pki/private/client1.domain.tld.key /tmp/vpndetails/client1.domain.tld.key'];C(L,'/tmp/easy-rsa/EasyRSA-v3.0.6');P=H.import_certificate(Certificate=F('/tmp/vpndetails/server.crt'),PrivateKey=F('/tmp/vpndetails/server.key'),CertificateChain=F('/tmp/vpndetails/ca.crt'));Q=['aws s3 cp /tmp/vpndetails/ca.crt {0}ca.crt'.format(D),'aws s3 cp /tmp/vpndetails/server.crt {0}server.crt'.format(D),'aws s3 cp /tmp/vpndetails/server.key {0}server.key'.format(D),'aws s3 cp /tmp/vpndetails/client1.domain.tld.crt {0}client1.domain.tld.crt'.format(D),'aws s3 cp /tmp/vpndetails/client1.domain.tld.key {0}client1.domain.tld.key'.format(D)];C(Q);cfnresponse.send(E,G,cfnresponse.SUCCESS,A,P['CertificateArn'])
	except K as I:B.error(I);R={O:I};cfnresponse.send(E,G,cfnresponse.FAILED,A)
def C(commands,workDir=P):
	I='PATH';A=os.environ.copy();A[I]='/tmp/bin:'+A[I];A['PYTHONPATH']='/tmp/:';A['EASYRSA_BATCH']='1';C=[]
	for E in commands:G=D.Popen([E],env=A,cwd=P,shell=Q,stdout=D.PIPE,stderr=D.PIPE);F,H=G.communicate();B.info(E);B.info(F);B.info(H);C.append(F)
	return C
def F(filename):return open(filename,'rb').read()
def main(event,context):
	E='RequestType';D=context;A=event;B.info(A);F=['pip3 install awscli --upgrade --no-cache-dir --ignore-installed --target=/tmp/'];C(F)
	if A[E]=='Delete':I(A,D)
	elif A[E]=='Create':J(A,D)
	elif A[E]=='Update':I(A,D,Q);J(A,D)