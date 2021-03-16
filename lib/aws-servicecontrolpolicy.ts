import cdk = require("@aws-cdk/core");
import log = require('@aws-cdk/aws-logs');
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");
import cr = require("@aws-cdk/custom-resources")
import fs = require("fs");

export class ScpEnabledPromise extends cdk.Construct { 
	
	public readonly ScpPromiseRole: iam.Role;
	
	constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
        
        super(scope, id); 
        
        const SCPCustomResourceRole = new iam.Role(
            this,
            "SCPCustomResourceRole",
            {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            }
        );
    
        SCPCustomResourceRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
            )
        );
    
        SCPCustomResourceRole.addToPolicy(
            new iam.PolicyStatement({
            resources: ['*'],
            actions: ["organizations:Create*", "organizations:Describe*", "organizations:ListRoots", "organizations:EnablePolicyType", "organizations:EnableAllFeatures" ],
            effect: iam.Effect.ALLOW,
            })
        );
        
        SCPCustomResourceRole.addToPolicy(
            new iam.PolicyStatement({
            resources: ['*'],
            actions: ["organizations:CreatePolicy","organizations:AttachPolicy", "organizations:DetachPolicy", "organizations:DeletePolicy" ],
            effect: iam.Effect.ALLOW,
            })
        );
        
        
        const serviceLinkRolePermissions = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": "iam:CreateServiceLinkedRole",
                    "Resource": "arn:aws:iam::*:role/aws-service-role/organizations.amazonaws.com/AWSServiceRoleForOrganizations",
                    "Condition": {"StringLike": {"iam:AWSServiceName": "organizations.amazonaws.com"}}
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "iam:AttachRolePolicy",
                        "iam:PutRolePolicy"
                    ],
                    "Resource": "arn:aws:iam::*:role/aws-service-role/organizations.amazonaws.com/AWSServiceRoleForOrganizations"
                }
            ]
        };

        const serviceLinkRolePermissionDoc = iam.PolicyDocument.fromJson(serviceLinkRolePermissions);
        const serviceLinkRolePolicy = new iam.Policy(this, 'serviceLinkRolePolicy', {
          document: serviceLinkRolePermissionDoc
        });
        
        serviceLinkRolePolicy.attachToRole(SCPCustomResourceRole);
        
        this.ScpPromiseRole = SCPCustomResourceRole;
        
        
        const SCPEnabledCustomResourceProvider = new cr.Provider(this, "scpEnabledResourceProvider", {
            onEventHandler: new lambda.SingletonFunction(this, "scpEnabledPromiseSingleton", {
                    role: SCPCustomResourceRole,
                    uuid: "1asdfasdfaw34535sdxf34235351d782",
                    code: new lambda.InlineCode(
                        fs.readFileSync("scripts/enableorgscp-customlambdaresource.py", {
                            encoding: "utf-8",
                        })
                    ),
                    handler: "index.main",
                    timeout: cdk.Duration.seconds(60),
                    runtime: lambda.Runtime.PYTHON_3_7,
            })
        });
        
        new cdk.CustomResource(this, 'scpEnabledPromise', { 
            serviceToken: SCPEnabledCustomResourceProvider.serviceToken,
            properties: {
                "enableOrgAndScp":"true"
            }
        });
        
	}
}


export interface ServiceControlPolicyProps extends cdk.StackProps {
  ScpsEnabledPromise: ScpEnabledPromise;
  Policy: string;
  PolicyName: string;
}


export class ServiceControlPolicy extends cdk.Construct { 
	constructor(scope: cdk.Construct, id: string, props: ServiceControlPolicyProps) {
        
        super(scope, id); 
        
        const scpCustomResourceProvider = new cr.Provider(this, "applyScpCustomResourceProvider", {
            onEventHandler: new lambda.SingletonFunction(this, "applyScpCustomResourceSingleton", {
                    role: props.ScpsEnabledPromise.ScpPromiseRole,
                    uuid: "123bh-ab28-4702-aa5a-2234235351d782",
                    code: new lambda.InlineCode(
                        fs.readFileSync("scripts/applyscp-customlambda-resource.py", {
                            encoding: "utf-8",
                        })
                    ),
                    handler: "index.main",
                    timeout: cdk.Duration.seconds(60),
                    runtime: lambda.Runtime.PYTHON_3_7,
            })
        });
        
        const scp = new cdk.CustomResource(this, 'ServiceControlPolicy', { 
            serviceToken: scpCustomResourceProvider.serviceToken,
            properties: {
                "policyContentInput": props.Policy,
                "policyNameInput": props.PolicyName
            }
        });
        
        scp.node.addDependency(props.ScpsEnabledPromise)
        
        
        
	}
}
