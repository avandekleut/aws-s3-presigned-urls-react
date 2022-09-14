import json
import urllib.parse
import boto3

from matching_generator.profile import Profile
from matching_generator.preference_sheet_parser import PreferenceSheetParser
from matching_generator.matching_generator import MatchingGenerator

print('Loading function')

s3 = boto3.client('s3')


def generate_matchings(filename):
    ranks = PreferenceSheetParser.generate_ranks('Sept 13 Copy of 2022 Set Draft.xlsx')

    matching = MatchingGenerator.generate_matching(ranks, strategy='RMA')

    profile = Profile.compute_profile_from_result(ranks, matching)

    with open('matching.json', 'w+') as f:
        f.write(json.dumps(matching, indent=2))


    with open('ranks.json', 'w+') as f:
        for applicant in ranks:
            for job in ranks[applicant]:
                ranks[applicant][job] = int(ranks[applicant][job])
        
        f.write(json.dumps(ranks, indent=2))

    return {'ranks': ranks, 'matching': matching, 'profile': profile}


def handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))

    # Get the object from the event and show its content type
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        print("CONTENT TYPE: " + response['ContentType'])
        print(json.dumps(response, indent=2))
        return response['ContentType']
    except Exception as e:
        print(e)
        print('Error getting object {} from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(key, bucket))
        raise e
              