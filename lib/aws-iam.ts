/**
Permission Boundaries do not appear to work as documented https://docs.aws.amazon.com/cdk/api/latest/docs/aws-iam-readme.html#permissions-boundaries, at this in this sample.  

I found https://github.com/aws/aws-cdk/issues/3242 but I am not sure how to apply that here, as we're creating the policy and that references an ARN

*/

import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';

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

export class PermissionBoundary extends cdk.Construct {
	constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id);

    const customPolicyDocument = iam.PolicyDocument.fromJson(policyDocument);
    const newManagedPolicy = new iam.ManagedPolicy(this, 'DiGavPermissionBoundaryPolicy', {
    document: customPolicyDocument
    });

    const sampleRole = new iam.Role(this, 'DiGav-Sample-Role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com');
        permissionsBoundary: newManagedPolicy;
    });
    sampleRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    
    //iam.PermissionsBoundary.of(AwsStartupBlueprintStack).apply(newManagedPolicy)
    }

}