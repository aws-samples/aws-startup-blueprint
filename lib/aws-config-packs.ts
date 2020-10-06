import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as cfg from '@aws-cdk/aws-config';
import * as fs from 'fs';
import { isMainThread } from 'worker_threads';

export class ConfigConformancePacks extends cdk.Construct {
	constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id);

    const configBucket = new s3.Bucket(this, 'ConfigBucket',{       
           
    });

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

    const configRecorder = new cfg.CfnConfigurationRecorder(this, 'ConfigRecorder', {
      name: "BlueprintConfigRecorder",
      roleArn: configRole.roleArn
    });


    const controlTowerDetectiveGuardRailsConformancePack = new cfg.CfnConformancePack(this, 'ControlTowerDetectiveGuardRailsConformancePack', {
      conformancePackName: "AWS-Control-Tower-Detective-Guardrails-Conformance-Pack",
      deliveryS3Bucket: configBucket.bucketName,
      deliveryS3KeyPrefix: "ct-detective-guardrails",
      templateBody: fs.readFileSync('config-packs/configpack.ct.detectiveguardrails.yaml').toString(),
      conformancePackInputParameters: [],      
    });

    const operationalBestPracticesForIamConformancePack = new cfg.CfnConformancePack(this, 'OperationalBestPracticesForIamConformancePack', {
        conformancePackName: "Operational-Best-Practices-For-AWS-Identity-And-Access-Management",
        deliveryS3Bucket: configBucket.bucketName,
        deliveryS3KeyPrefix: "iam-bestpractices",
        templateBody: fs.readFileSync('config-packs/configpack.iam.bestpractices.yaml').toString(),
        conformancePackInputParameters: []
    });

    const operationalBestPracticesForS3ConformancePack = new cfg.CfnConformancePack(this, 'OperationalBestPracticesForS3ConformancePack', {
        conformancePackName: "Operational-Best-Practices-For-Amazon-S3",
        deliveryS3Bucket: configBucket.bucketName,
        deliveryS3KeyPrefix: "s3-bestpractices",
        templateBody: fs.readFileSync('config-packs/configpack.s3.bestpractices.yaml').toString(),
        conformancePackInputParameters: []
    });

    const operationalBestPracticesForNistCsfConformancePack = new cfg.CfnConformancePack(this, 'OperationalBestPracticesForNistCsfConformancePack', {
        conformancePackName: "Operational-Best-Practices-for-NIST-CSF",
        deliveryS3Bucket: configBucket.bucketName,
        deliveryS3KeyPrefix: "nist-csf-bestpractices",
        templateBody: fs.readFileSync('config-packs/configpack.s3.bestpractices.yaml').toString(),
        conformancePackInputParameters: []
    });

    controlTowerDetectiveGuardRailsConformancePack.addDependsOn(configRecorder);
    operationalBestPracticesForIamConformancePack.addDependsOn(configRecorder);
    operationalBestPracticesForNistCsfConformancePack.addDependsOn(configRecorder);
    operationalBestPracticesForS3ConformancePack.addDependsOn(configRecorder);

  }
}