import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as cfg from '@aws-cdk/aws-config';
import * as fs from 'fs';
import { isMainThread } from 'worker_threads';



export interface ConfigConformancePacksProps extends cdk.StackProps {
  existingRecorderDeliveryBucket?: s3.Bucket;
  skipCreatingRecorderAndDeliveryChannel: boolean;
}


export class ConfigConformancePacks extends cdk.Construct {
  
  private ConfigRecorder:  cfg.CfnConfigurationRecorder;
  
	constructor(scope: cdk.Construct, id: string, props: ConfigConformancePacksProps) {
    super(scope, id);

    var deliveryBucketName = ""

    if(!props.skipCreatingRecorderAndDeliveryChannel){
        
        const configBucket = new s3.Bucket(this, 'ConfigBucket',{       
        });
        
        deliveryBucketName = configBucket.bucketName;
    
        new cfg.CfnDeliveryChannel(this, 'ConfigDeliveryChannel', {
          s3BucketName: configBucket.bucketName,
          name: "BlueprintConfigDeliveryChannel"
        });
    
        const AWSConfigConformsBucketPermissionsCheck = {
          "Sid": "AWSConfigConformsBucketPermissionsCheck",
          "Effect": "Allow",
          "Principal": {
            "AWS": [
                `arn:aws:iam::${cdk.Stack.of(this).account}:role/aws-service-role/config-conforms.amazonaws.com/AWSServiceRoleForConfigConforms`
            ]
          },
          "Action": "s3:GetBucketAcl",
          "Resource": `arn:aws:s3:::${configBucket.bucketName}`
        };
    
        const AWSConfigConformsBucketDelivery = {
          "Sid": "AWSConfigConformsBucketDelivery",
          "Effect": "Allow",
          "Principal": {
            "AWS": [
                `arn:aws:iam::${cdk.Stack.of(this).account}:role/aws-service-role/config-conforms.amazonaws.com/AWSServiceRoleForConfigConforms`
            ]
          },
          "Action": "s3:PutObject",
          "Resource": `arn:aws:s3:::${configBucket.bucketName}/*`,
          "Condition": {
            "StringEquals": {
              "s3:x-amz-acl": "bucket-owner-full-control"
            }
          }
        }
    
        const AWSConfigConformsBucketReadAccess = {
          "Sid": " AWSConfigConformsBucketReadAccess",
          "Effect": "Allow",
          "Principal": {
            "AWS": [
                `arn:aws:iam::${cdk.Stack.of(this).account}:role/aws-service-role/config-conforms.amazonaws.com/AWSServiceRoleForConfigConforms`
            ]
          },
          "Action": "s3:GetObject",
          "Resource": `arn:aws:s3:::${configBucket.bucketName}/*`
        }
    
    
        configBucket.addToResourcePolicy(iam.PolicyStatement.fromJson(AWSConfigConformsBucketPermissionsCheck));
        configBucket.addToResourcePolicy(iam.PolicyStatement.fromJson(AWSConfigConformsBucketDelivery));
        configBucket.addToResourcePolicy(iam.PolicyStatement.fromJson(AWSConfigConformsBucketReadAccess));
        configBucket.addToResourcePolicy(iam.PolicyStatement.fromJson(AWSConfigConformsBucketReadAccess));
    
        const recorderPolicyDoc = {
          "Version": "2012-10-17",
          "Statement": 
           [
         
             {
               "Effect": "Allow",
               "Action": ["s3:PutObject"],
               "Resource": [`arn:aws:s3:::${configBucket.bucketName}/*`],
               "Condition":
                {
                  "StringLike":
                    {
                      "s3:x-amz-acl": "bucket-owner-full-control"
                    }
                }
             },
             {
               "Effect": "Allow",
               "Action": ["s3:GetBucketAcl"],
               "Resource": `arn:aws:s3:::${configBucket.bucketName}`
             }
          ]
        }
    
        const configRole = new iam.Role(this, 'ConfigRecorderRole', {
          assumedBy: new iam.ServicePrincipal('config.amazonaws.com'),
          inlinePolicies: {
            configRecorderS3Access: iam.PolicyDocument.fromJson(recorderPolicyDoc)
          },
          managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSConfigRole')]
        });    
    
        this.ConfigRecorder = new cfg.CfnConfigurationRecorder(this, 'ConfigRecorder', {
          name: "BlueprintConfigRecorder",
          roleArn: configRole.roleArn,
          recordingGroup: {
            allSupported: true,
            includeGlobalResourceTypes: true
          }
        });
      
    } else {
      
      if(props.existingRecorderDeliveryBucket == null){
        throw new Error("When skipping recorder creation, you must supply an existing delivery bucket.")  
      
      }
      
      deliveryBucketName = props.existingRecorderDeliveryBucket.bucketName
      
    }

    
    const controlTowerDetectiveGuardRailsConformancePack = new cfg.CfnConformancePack(this, 'ControlTowerDetectiveGuardRailsConformancePack', {
      conformancePackName: "AWS-Control-Tower-Detective-Guardrails-Conformance-Pack",
      deliveryS3Bucket: deliveryBucketName,
      deliveryS3KeyPrefix: "ct-detective-guardrails",
      templateBody: fs.readFileSync('config-packs/configpack.ct.detectiveguardrails.yaml').toString(),
      conformancePackInputParameters: [],      
    });

    const operationalBestPracticesForIamConformancePack = new cfg.CfnConformancePack(this, 'OperationalBestPracticesForIamConformancePack', {
        conformancePackName: "Operational-Best-Practices-For-AWS-Identity-And-Access-Management",
        deliveryS3Bucket: deliveryBucketName,
        deliveryS3KeyPrefix: "iam-bestpractices",
        templateBody: fs.readFileSync('config-packs/configpack.iam.bestpractices.yaml').toString(),
        conformancePackInputParameters: []
    });

    const operationalBestPracticesForS3ConformancePack = new cfg.CfnConformancePack(this, 'OperationalBestPracticesForS3ConformancePack', {
        conformancePackName: "Operational-Best-Practices-For-Amazon-S3",
        deliveryS3Bucket: deliveryBucketName,
        deliveryS3KeyPrefix: "s3-bestpractices",
        templateBody: fs.readFileSync('config-packs/configpack.s3.bestpractices.yaml').toString(),
        conformancePackInputParameters: []
    });

    const operationalBestPracticesForNistCsfConformancePack = new cfg.CfnConformancePack(this, 'OperationalBestPracticesForNistCsfConformancePack', {
        conformancePackName: "Operational-Best-Practices-for-NIST-CSF",
        deliveryS3Bucket: deliveryBucketName,
        deliveryS3KeyPrefix: "nist-csf-bestpractices",
        templateBody: fs.readFileSync('config-packs/configpack.nist.csf.bestpractices.yaml').toString(),
        conformancePackInputParameters: []
    });


    if(!props.skipCreatingRecorderAndDeliveryChannel){
      
      controlTowerDetectiveGuardRailsConformancePack.addDependsOn(this.ConfigRecorder);
      operationalBestPracticesForIamConformancePack.addDependsOn(this.ConfigRecorder);
      operationalBestPracticesForNistCsfConformancePack.addDependsOn(this.ConfigRecorder);
      operationalBestPracticesForS3ConformancePack.addDependsOn(this.ConfigRecorder);
      
    }



  }
}