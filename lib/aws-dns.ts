import core = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");
import ec2 = require("@aws-cdk/aws-ec2");
import route53 = require('@aws-cdk/aws-route53');


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


  }
}