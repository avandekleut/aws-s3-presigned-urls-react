import numpy as np

from matching_generator.rank_maximal_allocation import RankMaximalAllocation
from matching_generator.round_robin import RoundRobin

class MatchingGenerator:
    
    @staticmethod
    def generate_matching(rankings, strategy='RMA'):
        """
        
            Parameters:
                rankings (dict): a dictionary {[applicant]: {[job]: [ranking]}}
                strategy ('RMA' | 'RR'): the strategy. RMA for Rank-Maximal Allocation and RR for Round Robin
                
            Returns:
                matching (dict): a dictionary of {[applicant]: [job1, job2, ...]} of selected jobs.
        
        """
        
        # general strategy: convert rankings to a ranking matrix, using inverse indices to convert back
        # given n applicants and m jobs, both strategies return min(n, m) assignments.
        # therefore, if we want to allow applicants to receive multiple jobs, we basically give everyone
        # their top choice first, and then remove the selected items from the pool, and run the process again.
        # we combine all of the results. 
        # in total, each person should receive at minimum floor(m/n) jobs.
        
        applicants = list(rankings.keys())
        applicants_mapping = {applicant: i for i, applicant in enumerate(applicants)}
        applicants_inverse_mapping = {i: applicant for i, applicant in enumerate(applicants)}

        jobs = []
        for applicant in applicants:
            applicant_jobs = rankings[applicant].keys()
            for job in applicant_jobs:
                jobs.append(job)
        jobs = list(set(jobs)) # get unique
        
        total_jobs = len(jobs)
        
        
        matching = {applicant: [] for applicant in applicants}
        while len(jobs) > 0:

            jobs_mapping = {job: j for j, job in enumerate(jobs)}
            jobs_inverse_mapping = {j: job for j, job in enumerate(jobs)}

            n = len(applicants)
            m = len(jobs)

            # default everything to be ranked as low as possible
            ranks = 2 * m * np.ones((n, m))
            for i in range(n):
                for j in range(m):
                    applicant_name = applicants_inverse_mapping[i]
                    job_name = jobs_inverse_mapping[j]


                    if job_name in rankings[applicant_name]:
                        rank = rankings[applicant_name][job_name]
                        ranks[i, j] = rank

            generate_matching = RankMaximalAllocation.generate_matching if strategy == 'RMA' else RoundRobin.generate_matching
            matched_applicants, matched_jobs = generate_matching(ranks)

            for applicant, job in zip(matched_applicants, matched_jobs):
                applicant_name = applicants_inverse_mapping[applicant]
                job_name = jobs_inverse_mapping[job]
                matching[applicant_name].append(job_name)
                
            for job in matched_jobs:
                job_name = jobs_inverse_mapping[job]
                jobs.remove(job_name)

        
        total_jobs_matched = sum(map(lambda x: len(x), matching.values()))
        assert total_jobs_matched == total_jobs, f'Expected total_jobs_matched to equal {total_jobs} but found {total_jobs_matched}'
        
        return matching
