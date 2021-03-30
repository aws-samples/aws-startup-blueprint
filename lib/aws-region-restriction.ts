import cdk = require("@aws-cdk/core");
import log = require('@aws-cdk/aws-logs');
import iam = require("@aws-cdk/aws-iam");
import ssm = require('@aws-cdk/aws-ssm');
import lambda = require("@aws-cdk/aws-lambda");
import cr = require("@aws-cdk/custom-resources")
import * as config from '@aws-cdk/aws-config';
import YAML = require('yaml')
import fs = require("fs");
import { ScpEnabledPromise, ServiceControlPolicy } from './aws-servicecontrolpolicy'


export interface RegionRestrictionProps extends cdk.StackProps {
  AllowedRegions: string[];
}

export class RegionRestriction extends cdk.Construct {
    
	constructor(scope: cdk.Construct, id: string, props: RegionRestrictionProps) {
        
        super(scope, id); 

        const serviceControlPolicyContent = JSON.parse(fs.readFileSync("scripts/policy-regionrestrictions-servicecontrolpolicy.json", {
            encoding: "utf-8",
        })); 
        
        const permissionBoundaryPolicyContent = JSON.parse(fs.readFileSync("scripts/policy-regionrestrictions-permissionboudary.json", {
            encoding: "utf-8",
        })); 

        serviceControlPolicyContent['Statement'][0]['Condition']['StringNotEquals']['aws:RequestedRegion'] = props.AllowedRegions;
        permissionBoundaryPolicyContent['Statement'][3]['Condition']['StringEquals']['aws:RequestedRegion'] = props.AllowedRegions;


        const enabledSCP = new ScpEnabledPromise(this, 'scpPromise', {});
        
        new ServiceControlPolicy(this, 'regionRestriction', {
            ScpsEnabledPromise: enabledSCP,
            PolicyName: "RegionRestriction",
            Policy: JSON.stringify(serviceControlPolicyContent)
        });

        const customPolicyDocument = iam.PolicyDocument.fromJson(permissionBoundaryPolicyContent);
        const customManagedPolicy = new iam.ManagedPolicy(this, "Region-Restriction-Permissions-Boundary-Policy", {
            document: customPolicyDocument
        });

        const sampleRole = new iam.Role(this, "RegionRestricted-Sample-Role", {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });

        iam.PermissionsBoundary.of(sampleRole).apply(customManagedPolicy);
        
        
        const enforceRegionConfigLambdaRole = new iam.Role( this, "enforceRegionConfigLambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            }
        );
    
        enforceRegionConfigLambdaRole.addManagedPolicy( iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
        enforceRegionConfigLambdaRole.addManagedPolicy( iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSConfigRulesExecutionRole"));
        
            
        

        const enforceRegionalPermissionBoundaryLambda = new lambda.SingletonFunction(this, "scpEnabledPromiseSingleton", {
            role: enforceRegionConfigLambdaRole,
            uuid: "enforceRegionalPermissionBoundaryLambda",
            code: new lambda.InlineCode(
                fs.readFileSync("scripts/config-enforcepermissionboundary.min.js", {
                    encoding: "utf-8",
                })
            ),
            handler: "index.handler",
            timeout: cdk.Duration.seconds(60),
            runtime: lambda.Runtime.NODEJS_12_X,
        });
        
        const boundaryMissingRemediationDoc = this.createBoundaryRemediationAutomationDoc();
        

        const configServicePrincipal = new iam.ServicePrincipal('config.amazonaws.com');
        
        const configPrincipalGrant = enforceRegionalPermissionBoundaryLambda.grantInvoke(configServicePrincipal);

        const enforceRegionalPermissionBoundary = new config.CustomRule(this, 'enforceRegionalPermissionBoundary', {
          lambdaFunction: enforceRegionalPermissionBoundaryLambda,
          configurationChanges: true,
          inputParameters: {
              desiredBoundaryPolicyArn: customManagedPolicy.managedPolicyArn
          },
          ruleScope: config.RuleScope.fromResources([config.ResourceType.IAM_ROLE, config.ResourceType.IAM_USER]), // restrict to all CloudFormation stacks and S3 buckets
        });
        
        enforceRegionalPermissionBoundary.node.addDependency(configPrincipalGrant);
        enforceRegionalPermissionBoundary.node.addDependency(enforceRegionalPermissionBoundaryLambda);
        
        
        const permissionBoundaryMissingRemediationConfig = new config.CfnRemediationConfiguration(this, 'permissionBoundaryMissingRemediationConfig', {
        	configRuleName: enforceRegionalPermissionBoundary.configRuleName,
        	targetId: boundaryMissingRemediationDoc.ref,
        	targetType: 'SSM_DOCUMENT',
        	automatic: false,
        	parameters: {
        		'permissionBoundaryPolicyArn': {
        			'StaticValue': {
        				'Values' : [ customManagedPolicy.managedPolicyArn ]
        			}
    			},
    			'offendingIamPrincipal': {
        			'ResourceValue': {
        				'Value' : 'RESOURCE_ID'
        			}
    			}
        	}
        });
    }
    
    private createBoundaryRemediationAutomationDoc() {
        
        
        const enforceBoundaryAutomationRole = new iam.Role(this, "enforceBoundaryAutomationRole", {
            assumedBy: new iam.ServicePrincipal('ssm.amazonaws.com'),
        });
        
        enforceBoundaryAutomationRole.addToPolicy(
            new iam.PolicyStatement({
                resources: ['*'],
                actions: ["iam:PutRolePermissionsBoundary", "iam:PutUserPermissionsBoundary", "config:GetResourceConfigHistory"],
                effect: iam.Effect.ALLOW,
            })
        );
        

        return new ssm.CfnDocument(this, 'remediateBoundaryDoc', {
            content: YAML.parse(`description: Used by AWS config to remediate roles and users which dont have a permission boundary.
schemaVersion: '0.3'
assumeRole: '${enforceBoundaryAutomationRole.roleArn}'
parameters:
  permissionBoundaryPolicyArn:
    type: String
  offendingIamPrincipal:
    type: String
mainSteps:
  - name: Apply_permission_boundary
    action: 'aws:executeScript'
    inputs:
      InputPayload:
        permissionBoundaryPolicyArn: '{{ permissionBoundaryPolicyArn }}'
        offendingIamPrincipal: '{{ offendingIamPrincipal }}'
      Runtime: python3.6
      Handler: script_handler
      Script: |-
        import boto3
        
        def script_handler(events, context):
            print(events)
            print(context)
        
            iam = boto3.client('iam')
            config = boto3.client('config')
            
            principalType = '';
            
            try: 
                principalHistory = config.get_resource_config_history(resourceType='AWS::IAM::User', resourceId=events['offendingIamPrincipal'])
                principalIsUser = 'AWS::IAM::User'
            
            except config.exceptions.ResourceNotDiscoveredException as err:
                principalHistory = config.get_resource_config_history(resourceType='AWS::IAM::Role', resourceId=events['offendingIamPrincipal'])
                principalIsUser = 'AWS::IAM::Role'
                
        
            if(principalIsUser == 'AWS::IAM::User'):
                response = iam.put_user_permissions_boundary(
                    UserName=principalHistory['configurationItems'][0]['resourceName'],
                    PermissionsBoundary=events['permissionBoundaryPolicyArn']
                )
                return response
            
            if(principalIsUser == 'AWS::IAM::Role'):
                response = iam.put_role_permissions_boundary(
                    RoleName=principalHistory['configurationItems'][0]['resourceName'],
                    PermissionsBoundary=events['permissionBoundaryPolicyArn']
                )
                return response
            
            raise Exception("Uknown principal type.")
            
	      
`),
            documentType: "Automation",
        });
    }
}
