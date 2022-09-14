import json
import urllib.parse
import boto3
import io

from matching_generator.profile import Profile
from matching_generator.preference_sheet_parser import PreferenceSheetParser
from matching_generator.matching_generator import MatchingGenerator

print('Loading function')

s3 = boto3.client('s3')


def generate_matchings(file):
    ranks = PreferenceSheetParser.generate_ranks(file)

    matching = MatchingGenerator.generate_matching(ranks, strategy='RMA')

    profile = Profile.compute_profile_from_result(ranks, matching)

    return ranks, matching, profile


def handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))

    # Get the object from the event and show its content type
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    try:
        uuid = key.split("/")[0] # folder name. Key is <uuid>/preferences.xlsx
        obj = s3.get_object(Bucket=bucket, Key=key)

        body = io.BytesIO(obj['Body'].read())
        ranks, matching, profile = generate_matchings(body)

        s3.put_object(
            Body=json.dumps(ranks, indent=4, ensure_ascii=False),
            Bucket=bucket,
            Key=f'{uuid}/ranks.json'
        )

        s3.put_object(
            Body=json.dumps(matching, indent=4, ensure_ascii=False),
            Bucket=bucket,
            Key=f'{uuid}/matching.json'
        )

        return {"profile": profile, "ranks": ranks, "matching":matching}

    except Exception as e:
        print(e)
        print('Error getting object {} from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(key, bucket))
        raise e
              
if __name__ == '__main__':
    event = {
        "Records": [
            {
            "eventVersion": "2.0",
            "eventSource": "aws:s3",
            "awsRegion": "us-east-1",
            "eventTime": "1970-01-01T00:00:00.000Z",
            "eventName": "ObjectCreated:Put",
            "userIdentity": {
                "principalId": "EXAMPLE"
            },
            "requestParameters": {
                "sourceIPAddress": "127.0.0.1"
            },
            "responseElements": {
                "x-amz-request-id": "EXAMPLE123456789",
                "x-amz-id-2": "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH"
            },
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "testConfigRule",
                "bucket": {
                "name": "presigned-url-dev-presignedurldev997733e0-pn9lk5uf6o0l",
                "ownerIdentity": {
                    "principalId": "EXAMPLE"
                },
                "arn": "arn:aws:s3:::presigned-url-dev-presignedurldev997733e0-pn9lk5uf6o0l"
                },
                "object": {
                "key": "f45631ee-bbaa-4646-8792-56c3b60d1e87/preferences.xlsx",
                "size": 277,
                "eTag": "7c6dfc0d3c9caad25546a2d2791a5d45",
                }
            }
            }
        ]
        }
    response = handler(event, None)