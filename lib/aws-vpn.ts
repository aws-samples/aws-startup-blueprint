import core = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");
import ec2 = require("@aws-cdk/aws-ec2");
import log = require('@aws-cdk/aws-logs');
import iam = require("@aws-cdk/aws-iam");
import cr = require("@aws-cdk/custom-resources")
import lambda = require("@aws-cdk/aws-lambda");

import * as fs from 'fs';
import { CfnAccessPoint } from "@aws-cdk/aws-s3";


export interface VpnProps extends core.StackProps {
  HomeVpc: ec2.Vpc;
  vpnClientAssignedAddrCidr: string;  
  ProductionVpc: ec2.Vpc;
  ManagmentVPC: ec2.Vpc;
  DevelopmentVpc: ec2.Vpc;
  DnsServer: string;
}

export class ClientVpn extends core.Construct {
  
  public readonly ClientVpnEndpoint: ec2.CfnClientVpnEndpoint;
  
  constructor(scope: core.Construct, id: string, props: VpnProps) {
    super(scope, id);
    
    const vpnCertCustomResourceRole = new iam.Role(this, 'VpnCertificateLambdaCustomResourceRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    vpnCertCustomResourceRole.addToPolicy(new iam.PolicyStatement({
      resources: ["*"],
      actions: ['acm:ImportCertificate', 'acm:DeleteCertificate'] 
    }));

    vpnCertCustomResourceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    const vpnBucket = new s3.Bucket(this, 'VpnConfigBucket', {});

    vpnBucket.grantReadWrite(vpnCertCustomResourceRole);
    
    
    const vpnCertificateProvider = new cr.Provider(this, "vpnCertificateProvider", {
        onEventHandler: new lambda.SingletonFunction(this, "vpnCertificateSingleton", {
            role: vpnCertCustomResourceRole, 
            uuid: "CreateVpnCertificateLambda",
            code: new lambda.InlineCode(fs.readFileSync('scripts/vpn-endpoint-security-resource-handler.min.py', { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: core.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_7,
            memorySize: 1024
        })
    });

    const vpnCertificate = new core.CustomResource(this, 'vpnCertificate', { 
        serviceToken: vpnCertificateProvider.serviceToken,
        properties: {
          VpnConfigBucket: `s3://${vpnBucket.bucketName}/`
        }
    });

    
    
    

    const vpnAccessLogGroup = new log.LogGroup(this, 'ClientVpnAccessLogGroup', {
      retention: log.RetentionDays.SIX_MONTHS
    });
    const vpnAccessLogStream = new log.LogStream(this, 'ClientVpnAccessLogStream', {
      logGroup: vpnAccessLogGroup,
    });
    
    let connectionLogOptions: ec2.CfnClientVpnEndpoint.ConnectionLogOptionsProperty = {
          cloudwatchLogGroup: vpnAccessLogGroup.logGroupName,
          cloudwatchLogStream: vpnAccessLogStream.logStreamName,
          enabled: true
    };

    let authOptions: Array<ec2.CfnClientVpnEndpoint.ClientAuthenticationRequestProperty> = [{
      type: "certificate-authentication",
      mutualAuthentication: {
          clientRootCertificateChainArn: vpnCertificate.ref
      }
    }];
    
    const vpnUsersSecurityGroup = new ec2.SecurityGroup(this, 'VpnUsersSG', {
      vpc: props.HomeVpc,
      securityGroupName: 'VpnUsersSG',
      description: 'Security group associated with VPN users accessing the network through the Client VPN Endpoint in the managment VPC.',
      allowAllOutbound: true   
    });

    const VpnEndpoint = new ec2.CfnClientVpnEndpoint(this, 'clientVpnEndpoint', {                   
        authenticationOptions: authOptions,
        clientCidrBlock: props.vpnClientAssignedAddrCidr, 
        connectionLogOptions: connectionLogOptions,
        serverCertificateArn: vpnCertificate.ref, 
        description: "Internal VPN Endpoint",
        splitTunnel: true,
        vpcId: props.HomeVpc.vpcId,
        securityGroupIds: [vpnUsersSecurityGroup.securityGroupId],        
        dnsServers: [props.DnsServer],
    });
    
    const publicSubnetSelection = { subnetType: ec2.SubnetType.PUBLIC };
    const vpnSubnets = props.HomeVpc.selectSubnets(publicSubnetSelection).subnetIds;
    
    var networkAssocations = new Array<ec2.CfnClientVpnTargetNetworkAssociation>();

    vpnSubnets.forEach((vpnSubnet, index) => {
      networkAssocations.push(new ec2.CfnClientVpnTargetNetworkAssociation(this, `${index}-clientVpnEndpointAssociation`, {
        clientVpnEndpointId: VpnEndpoint.ref,
        subnetId: vpnSubnet,
        
      }));    
    });

    

    
    new ec2.CfnClientVpnAuthorizationRule(this, 'ProductionAuthorization', {
        clientVpnEndpointId: VpnEndpoint.ref,
        targetNetworkCidr: props.ProductionVpc.vpcCidrBlock,
        authorizeAllGroups: true,
        description: "Allows VPN users access to Production VPC"
    });
    
    new ec2.CfnClientVpnAuthorizationRule(this, 'DevelopmentAuthorization', {
        clientVpnEndpointId: VpnEndpoint.ref,
        targetNetworkCidr: props.DevelopmentVpc.vpcCidrBlock,        
        authorizeAllGroups: true,
        description: "Allows VPN users access to Development VPC"
    });
    
    new ec2.CfnClientVpnAuthorizationRule(this, 'ManagmentAuthorization', {
        clientVpnEndpointId: VpnEndpoint.ref,
        targetNetworkCidr: props.ManagmentVPC.vpcCidrBlock,        
        authorizeAllGroups: true,
        description: "Allows Transit VPN users access to Managment VPC"
    });
            
    vpnSubnets.forEach((vpnSubnet, index) => {

      const productionRoute = new ec2.CfnClientVpnRoute(this, `${index}-productionRoute`, {
        clientVpnEndpointId: VpnEndpoint.ref,
        destinationCidrBlock: props.ProductionVpc.vpcCidrBlock,
        targetVpcSubnetId: vpnSubnet
      });

      const developmentRoute = new ec2.CfnClientVpnRoute(this, `${index}-developmentRoute`, {
        clientVpnEndpointId: VpnEndpoint.ref,
        destinationCidrBlock: props.DevelopmentVpc.vpcCidrBlock,
        targetVpcSubnetId: vpnSubnet
      });

      networkAssocations.forEach(networkAssocation => {
        productionRoute.addDependsOn(networkAssocation);
        developmentRoute.addDependsOn(networkAssocation);
      });

    });
    
  }
}


  