import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as cfg from '@aws-cdk/aws-config';
import * as fs from 'fs';
import { isMainThread } from 'worker_threads';



export interface ConfigRecorderEnabledPromiseProps extends cdk.StackProps {
  existingRecorderDeliveryBucket?: s3.Bucket;
  skipCreatingRecorderAndDeliveryChannel: boolean;
  
}


export class ConfigRecorderEnabledPromise extends cdk.Construct {
    
    public ConfigDeliveryBucketName: string;
    public ConfigRecorder:  cfg.CfnConfigurationRecorder;
    public SkippedCreatingRecorder: boolean;
  
  	constructor(scope: cdk.Construct, id: string, props: ConfigRecorderEnabledPromiseProps) {
  	  super(scope, id);
  	  
        this.ConfigDeliveryBucketName = "";

        if(!props.skipCreatingRecorderAndDeliveryChannel){
            
            this.SkippedCreatingRecorder = false;
            
            const configBucket = new s3.Bucket(this, 'ConfigBucket',{       
            });
            
            this.ConfigDeliveryBucketName = configBucket.bucketName;
        
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
            this.ConfigDeliveryBucketName = props.existingRecorderDeliveryBucket.bucketName
            this.SkippedCreatingRecorder = true;

        }
  	  
	  }
}

export interface ConfigConformancePackConfig {
    ConformancePackName: string;
    TemplatePath: string;
}


export interface ConfigConformancePackBundleProps extends cdk.StackProps {
  ConfigRecorderEnabledPromise: ConfigRecorderEnabledPromise;
  PackConfigs: ConfigConformancePackConfig[];
}

export class ConfigConformancePackBundle extends cdk.Construct {
  
  private ConfigRecorder:  cfg.CfnConfigurationRecorder;
  
	constructor(scope: cdk.Construct, id: string, props: ConfigConformancePackBundleProps) {
    super(scope, id);

    for(let conformancePackConfig of props.PackConfigs){
        
        const conformancePack = new cfg.CfnConformancePack(this, `CP-${conformancePackConfig.ConformancePackName}`, {
            conformancePackName: conformancePackConfig.ConformancePackName,
            deliveryS3Bucket: props.ConfigRecorderEnabledPromise.ConfigDeliveryBucketName,
            deliveryS3KeyPrefix: conformancePackConfig.ConformancePackName,
            templateBody: fs.readFileSync(conformancePackConfig.TemplatePath).toString(),
            conformancePackInputParameters: [],      
        });
        
        
        if(!props.ConfigRecorderEnabledPromise.SkippedCreatingRecorder){
            conformancePack.addDependsOn(props.ConfigRecorderEnabledPromise.ConfigRecorder)
        }
    }

  }
}