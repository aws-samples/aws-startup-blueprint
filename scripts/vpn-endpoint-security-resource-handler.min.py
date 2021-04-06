S=True
R='/tmp/'
Q='ErrorMessage'
P='responseData'
O='VpnConfigBucket'
N='ResourceProperties'
M=Exception
L='PhysicalResourceId'
K=False
import subprocess as D,os,sys,boto3 as B,logging as G,json,traceback
T=B.client('ec2')
U=B.client('ssm')
H=B.client('acm')
A=G.getLogger()
A.setLevel(G.INFO)
E={}
def I(event,context,isUpdate=K):
	D=event
	try:
		E['Complete']='True';F=D[L];B=D[N][O];I=['aws s3 rm {0}ca.crt'.format(B),'aws s3 rm {0}server.crt'.format(B),'aws s3 rm {0}server.key'.format(B),'aws s3 rm {0}client1.domain.tld.crt'.format(B),'aws s3 rm {0}client1.domain.tld.key'.format(B)];R=C(I);H.delete_certificate(CertificateArn=F)
		if isUpdate==K:return{L:F,P:E}
	except M as G:A.error(G);J=G.args[0];S={Q:J};return K
def J(event,context):
	try:A.info('Starting to create certificate');B=event[N][O];I=['curl -L https://github.com/OpenVPN/easy-rsa/releases/download/v3.0.6/EasyRSA-unix-v3.0.6.tgz -O','mkdir /tmp/easyrsa','mkdir /tmp/vpndetails','tar -xvzf /tmp/EasyRSA-unix-v3.0.6.tgz -C /tmp/easyrsa','ls /tmp/easyrsa'];C(I);J=['/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa init-pki','/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-ca nopass','/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-server-full server nopass','/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-client-full client1.domain.tld nopass','cp /tmp/pki/ca.crt /tmp/vpndetails/ca.crt','cp /tmp/pki/issued/server.crt /tmp/vpndetails/server.crt','cp /tmp/pki/private/server.key /tmp/vpndetails/server.key','cp /tmp/pki/issued/client1.domain.tld.crt /tmp/vpndetails/client1.domain.tld.crt','cp /tmp/pki/private/client1.domain.tld.key /tmp/vpndetails/client1.domain.tld.key'];C(J,'/tmp/easy-rsa/EasyRSA-v3.0.6');D=H.import_certificate(Certificate=F('/tmp/vpndetails/server.crt'),PrivateKey=F('/tmp/vpndetails/server.key'),CertificateChain=F('/tmp/vpndetails/ca.crt'));A.info(D);K=['aws s3 cp /tmp/vpndetails/ca.crt {0}ca.crt'.format(B),'aws s3 cp /tmp/vpndetails/server.crt {0}server.crt'.format(B),'aws s3 cp /tmp/vpndetails/server.key {0}server.key'.format(B),'aws s3 cp /tmp/vpndetails/client1.domain.tld.crt {0}client1.domain.tld.crt'.format(B),'aws s3 cp /tmp/vpndetails/client1.domain.tld.key {0}client1.domain.tld.key'.format(B)];C(K);return{P:E,L:D['CertificateArn']}
	except M as G:A.error(G);R={Q:G};return R
def C(commands,workDir=R):
	I='PATH';B=os.environ.copy();B[I]='/tmp/bin:'+B[I];B['PYTHONPATH']='/tmp/:';B['EASYRSA_BATCH']='1';C=[]
	for E in commands:G=D.Popen([E],env=B,cwd=R,shell=S,stdout=D.PIPE,stderr=D.PIPE);F,H=G.communicate();A.info(E);A.info(F);A.info(H);C.append(F)
	return C
def F(filename):return open(filename,'rb').read()
def main(event,context):
	E='RequestType';D=context;B=event;A.info(B);F=['pip3 install awscli --upgrade --no-cache-dir --ignore-installed --target=/tmp/'];C(F)
	if B[E]=='Delete':return I(B,D)
	elif B[E]=='Create':return J(B,D)
	elif B[E]=='Update':I(B,D,S);return J(B,D)