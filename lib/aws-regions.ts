import cdk = require("@aws-cdk/core");
import log = require('@aws-cdk/aws-logs');
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");


export class RegionRestriction extends cdk.Construct {
	constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id);

            const regionsFn = new lambda.Function(this, 'regionsFn', {
            runtime: lambda.Runtime.PYTHON_3_7,
            code: lambda.Code.fromAsset('./scripts/'),
            handler: 'restrictregionpolicy-customlambdaresource.handler',
        });

        if (regionsFn.role) {
            regionsFn.role.addToPrincipalPolicy(new iam.PolicyStatement({
                actions: ['iam.CreateRole', 'iam.CreatePolicy', 'iam.AddRoleToInstanceProfile', 'iam.AttachRolePolicy', 'iam.CreateInstanceProfile', 
                'iam.CreatePolicyVersion', 'iam.DeleteInstanceProfile', 'iam.DeletePolicy', 'iam.DeletePolicyVersion', 'iam.DeleteRole', 'iam.DeleteRolePermissionsBoundary', 
                'iam.DeleteRolePolicy', 'iam.DetachRolePolkicy', 'iam.Get*', 'iam.List*', 'iam.RemoveRoleFromInstanceProfile', 'iam.PutRolePermissionBoundary', 'iam.PutRolePolicy',
                'organizations.AttachPolicy', 'organizations.CreatePolicy', 'organizations.DeletePolicy', 'organizations.DescribeOrganization', 'organizations.DescribePolicy', 
                'organizations.DetachPolicy', 'organizations.ListPolicies*', 'organizations.UpdatePolicy'],
                resources: ['*'],
            }));
        }

        const regionsFnProvider = new customresources.Provider(this, 'RegionFnCustomResource', {
            onEventHandler: regionsFn,
        });

        const CustomResource = new CustomResource(this, 'regionCustomResource', {
            serviceToken: regionsFn.functionArn,
            properties: {},
        });
    }
}
