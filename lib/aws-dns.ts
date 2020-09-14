import core = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");
import ec2 = require("@aws-cdk/aws-ec2");
import route53 = require('@aws-cdk/aws-route53');
import route53Resolver = require('@aws-cdk/aws-route53resolver');


export interface DnsProps extends core.StackProps {
  ProductionVpc: ec2.Vpc;
  ManagmentVPC: ec2.Vpc;
  DevelopmentVpc: ec2.Vpc;
  TopLevelDomain: string;
}

export class Dns extends core.Construct {
  
  public readonly ClientVpnEndpoint: ec2.CfnClientVpnEndpoint;

  constructor(scope: core.Construct, id: string, props: DnsProps) {
    super(scope, id);
    
    const zone = new route53.PrivateHostedZone(this, 'HostedZone', {
        zoneName: props.TopLevelDomain,
        vpc: props.ManagmentVPC
    });
    zone.addVpc(props.ProductionVpc);
    zone.addVpc(props.DevelopmentVpc)

    const resolverSecurityGroup = new ec2.SecurityGroup(this, 'ResolverSecurityGroup', {
        vpc: props.ManagmentVPC,
        description: 'Route 53 Resolver Group. Allows resources in production and development vpcs to resolve internal Amazon DNS address across VPCs.',
        allowAllOutbound: true   // Can be set to false
    });
    resolverSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.ManagmentVPC.vpcCidrBlock), ec2.Port.tcp(53), 'Allow inbound DNS queries from mgmt vpc tcp.');
    resolverSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.ProductionVpc.vpcCidrBlock), ec2.Port.tcp(53), 'Allow inbound DNS queries from production vpc tcp.');
    resolverSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.DevelopmentVpc.vpcCidrBlock), ec2.Port.tcp(53), 'Allow inbound DNS queries from development vpc tcp.');

    resolverSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.ManagmentVPC.vpcCidrBlock), ec2.Port.udp(53), 'Allow inbound DNS queries from mgmt vpc udp.');
    resolverSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.ProductionVpc.vpcCidrBlock), ec2.Port.udp(53), 'Allow inbound DNS queries from production vpc udp.');
    resolverSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.DevelopmentVpc.vpcCidrBlock), ec2.Port.udp(53), 'Allow inbound DNS queries from development vpc udp.');


  }
}