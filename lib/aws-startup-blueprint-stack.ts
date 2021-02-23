import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import { ConfigConformancePacks } from './aws-config-packs'
import { ClientVpn } from './aws-vpn'
import { BlueprintVpcs } from './aws-vpcs'
import { Dns } from './aws-dns'
import { BlueprintServiceCatalog } from './aws-service-catalog'


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

    new ConfigConformancePacks(this, 'ConfigPacks', {});

    new Dns(this,'Dns', {
      ManagmentVPC: blueprintVPCs.ManagmentVPC,
      ProductionVpc: blueprintVPCs.ProductionVpc,
      DevelopmentVpc: blueprintVPCs.DevelopmentVpc,      
      TopLevelDomain: "corp"      
    });

    new BlueprintServiceCatalog(this, 'ServiceCatalog', {});

    const policyDocument = {

      "Version": "2012-10-17",
      "Statement": [
          {
              "Sid": "EnforceBoundary",
              "Effect": "Allow",
              "Action": [
                  "iam:CreateRole",
                  "iam:DeleteRolePolicy",
                  "iam:AttachRolePolicy",
                  "iam:DetachRolePolicy",
                  "iam:PutRolePolicy",
                  "iam:PutRolePermissionsBoundary",
                  "iam:CreateUser",
                  "iam:DeleteUserPolicy",
                  "iam:AttachUserPolicy",
                  "iam:DetachUserPolicy",
                  "iam:PutUserPolicy",
                  "iam:PutUserPermissionsBoundary"
              ],
              "Resource": "*",
              "Condition": {
                  "StringLike": {
                      "iam:PermissionsBoundary": "arn:aws:iam::*:policy/boundary-policy"
                  }
              }
          },
          {
              "Sid": "DenyBoundaryPolicyEdit",
              "Effect": "Deny",
              "Action": [
                  "iam:*PolicyVersion",
                  "iam:DeletePolicy",
                  "iam:SetDefaultPolicyVersion"
              ],
              "Resource": "arn:aws:iam::*:policy/boundary-policy"
          },
          {
              "Sid": "NoBoundaryUserDelete",
              "Effect": "Deny",
              "Action": "iam:Delete*PermissionsBoundary",
              "Resource": "*"
          },
          {
              "Sid": "AllowNotIAMTasks",
              "Effect": "Allow",
              "NotAction": [
                  "iam:CreateRole",
                  "iam:DeleteRolePolicy",
                  "iam:AttachRolePolicy",
                  "iam:DetachRolePolicy",
                  "iam:PutRolePolicy",
                  "iam:PutRolePermissionsBoundary",
                  "iam:CreateUser",
                  "iam:DeleteUserPolicy",
                  "iam:AttachUserPolicy",
                  "iam:DetachUserPolicy",
                  "iam:PutUserPolicy",
                  "iam:PutUserPermissionsBoundary"
              ],
              "Resource": "*",
              "Condition": {
                  "StringEquals": {
                      "aws:RequestedRegion": [
                          "us-east-1",
                          "us-west-2",
                          "us-east-2"
                          ]
                      }
                  }
          }
      ]
  };
  
  const customPolicyDocument = iam.PolicyDocument.fromJson(policyDocument);
  const newManagedPolicy = new iam.ManagedPolicy(AwsStartupBlueprintStack, 'DiGavPermissionBoundaryPolicy', {
      document: customPolicyDocument
  });

  iam.PermissionsBoundary.of(AwsStartupBlueprintStack).apply(newManagedPolicy)

  }

}
