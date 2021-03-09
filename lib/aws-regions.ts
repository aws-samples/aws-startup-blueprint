import cdk = require("@aws-cdk/core");
import log = require('@aws-cdk/aws-logs');
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");
import cfn = require("@aws-cdk/aws-cloudformation");
import fs = require("fs");

// Import policy from JSON file
const scpPolicy = fs.readFileSync("scripts/DiGavSCP.json", {
    encoding: "utf-8",
})

export class RegionRestriction extends cdk.Construct {
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
            actions: ["organizations.Create*", "organizations.Describe*", "organizations.ListRoots", "organizations.EnablePolicyType"],
            effect: iam.Effect.ALLOW,
            })
        );
  
        const ensureSCPCustomResource = new cfn.CustomResource(this, "ensureSCPCustomResource", {
            provider: cfn.CustomResourceProvider.lambda(
                new lambda.SingletonFunction(this, "Singleton", {
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
            ),
            properties: {
                policyContentInput: scpPolicy,
            }
        });
        
        const createSCPCustomResource = new cfn.CustomResource(this, "createSCPCustomResource", {
            provider: cfn.CustomResourceProvider.lambda(
                new lambda.SingletonFunction(this, "Singleton", {
                    role: SCPCustomResourceRole,
                    uuid: "f44eb9d4-dc51-4dce-a382-4e862add9db7",
                    code: new lambda.InlineCode(
                        fs.readFileSync("scripts/restrictregionpolicy-customlambdaresource.py", {
                            encoding: "utf-8",
                        })
                    ),
                    handler: "index.main",
                    timeout: cdk.Duration.seconds(60),
                    runtime: lambda.Runtime.PYTHON_3_7,
                })
            ),
            properties: {}
        });

        createSCPCustomResource.addDependsOn(ensureSCPCustomResource);
    }
}
