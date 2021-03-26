import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as s3 from '@aws-cdk/aws-s3';
import { ConfigConformancePacks } from './aws-config-packs'
import { ClientVpn } from './aws-vpn'
import { BlueprintVpcs } from './aws-vpcs'
import { Dns } from './aws-dns'
import { BlueprintServiceCatalog } from './aws-service-catalog'
import { RegionRestriction } from './aws-region-restriction'


export class AwsStartupBlueprintStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const blueprintVPCs = new BlueprintVpcs(this, 'VpcCore', {});

    new ClientVpn(this, 'ClientVpn',{
      HomeVpc: blueprintVPCs.ManagmentVPC,      
      vpnClientAssignedAddrCidr: "10.71.0.0/16",
      DnsServer: blueprintVPCs.MangementVpcDnsIp,
      ProductionVpc: blueprintVPCs.ProductionVpc,
      ManagmentVPC: blueprintVPCs.ManagmentVPC,
      DevelopmentVpc: blueprintVPCs.DevelopmentVpc
    });

    new ConfigConformancePacks(this, 'ConfigPacks', {
      skipCreatingRecorderAndDeliveryChannel: false
    });

    new Dns(this,'Dns', {
      ManagmentVPC: blueprintVPCs.ManagmentVPC,
      ProductionVpc: blueprintVPCs.ProductionVpc,
      DevelopmentVpc: blueprintVPCs.DevelopmentVpc,      
      TopLevelDomain: "corp"      
    });
    

    const apply_EU_RegionRestriction = this.node.tryGetContext('apply_EU_RegionRestriction');
    const apply_US_RegionRestriction = this.node.tryGetContext('apply_US_RegionRestriction');
    
    if(apply_EU_RegionRestriction == "true") {
      new RegionRestriction(this, 'RegionRestriction', {
        AllowedRegions: ["eu-central-1","eu-west-1","eu-west-3", "eu-south-1", "eu-north-1"]
      });  
    } 
    else if (apply_US_RegionRestriction == "true"){
      new RegionRestriction(this, 'RegionRestriction', {
        AllowedRegions: ["us-east-1","us-east-2","us-west-1", "us-west-2"]
      }); 
      
    }
    
  }

}
