import cdk = require("@aws-cdk/core");
import log = require('@aws-cdk/aws-logs');
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");
import cfn = require("@aws-cdk/aws-cloudformation");
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
            actions: ["organizations:Create*", "organizations:Describe*", "organizations:ListRoots", "organizations:EnablePolicyType"],
            effect: iam.Effect.ALLOW,
            })
        );
        
        this.ScpPromiseRole = SCPCustomResourceRole;
  
        const SCPEnabledCustomResource = new cfn.CustomResource(this, "scpEnabledPromise", {
            provider: cfn.CustomResourceProvider.lambda(
                new lambda.SingletonFunction(this, "scpEnabledPromiseSingleton", {
                    role: SCPCustomResourceRole,
                    uuid: "48b87370-ab28-4702-aa5a-2515b2a7d782",
                    code: new lambda.InlineCode(
                        fs.readFileSync("scripts/enableorgscp-customlambdaresource.py", {
                            encoding: "utf-8",
                        })
                    ),
                    handler: "index.main",
                    timeout: cdk.Duration.seconds(60),
                    runtime: lambda.Runtime.PYTHON_3_7,
                })
            )
        });
        
	}
}


export interface ServiceControlPolicyProps extends cdk.StackProps {
  ScpsEnabledPromise: ScpEnabledPromise;
  Policy: string;
}


export class ServiceControlPolicy extends cdk.Construct { 
	constructor(scope: cdk.Construct, id: string, props: ServiceControlPolicyProps) {
        
        super(scope, id); 
        
        const scpCustomResource = new cfn.CustomResource(this, "applyScpCustomResource", {
            provider: cfn.CustomResourceProvider.lambda(
                new lambda.SingletonFunction(this, "ensureSCPSingleton", {
                    role: props.ScpsEnabledPromise.ScpPromiseRole,
                    uuid: "48b87370-ab28-4702-aa5a-2515b2a7d782",
                    code: new lambda.InlineCode(
                        fs.readFileSync("scripts/applyscp-customlambda-resource.py", {
                            encoding: "utf-8",
                        })
                    ),
                    handler: "index.main",
                    timeout: cdk.Duration.seconds(60),
                    runtime: lambda.Runtime.PYTHON_3_7,
                })
            ),
            properties: {
                policyContentInput: props.Policy,
            }
        });
        
        scpCustomResource.node.addDependency(props.ScpsEnabledPromise);
        
        
	}
}



export class EURegionRestriction extends cdk.Construct {
	constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
        
        super(scope, id); 

        const enabledSCP = new ScpEnabledPromise(this, 'scpPromise', {});
        
        new ServiceControlPolicy(this, 'euRegionRestriction', {
            ScpsEnabledPromise: enabledSCP,
            Policy: fs.readFileSync("scripts/DiGavSCP.json", {
                encoding: "utf-8",
            })
        });
        
    }
}
