import numpy as np

class Profile:
    @staticmethod
    def compute_profile(ranks, applicants, jobs):
        """
        Returns the profile of a matching of applicants to jobs given the overall ranks.

            Parameters:
                ranks (np.ndarray): an n x m matrix of rankings, where ranks[i,j] is the rank of applicant i for job j
                applicants (np.ndarray): an n-vector of applicant indices
                jobs (np.ndarray): an m-vector of selected jobs corresponding to each applicant, so that jobs[i] is the choice of job for applicant[i]

            Returns:
                profile (np.ndarray): an m-vector where profile[i] is the number of applicants who were assigned their i'th pick of job
        """
        
        # applicants may be in an order different than [0, 1, 2, ...]
        selected_ranks = ranks[applicants]
        (n, m)  = selected_ranks.shape

        # Argsort turns an array of ranks into a list of jobs, ranked
        argsort = np.argsort(selected_ranks, axis=1)

        profile = np.zeros(m)

        for j in range(m):
            # Count how many jobs ranked 1st by applicants are equal to the jobs assigned.
            # Then, count how many jobs ranked 2nd were equal to the jobs assigned. etc.
            profile[j] = (argsort[:, j] == jobs).sum()

        # we should have assigned one job for each applicant.
        assert profile.sum() == n
        return profile
    
    @staticmethod
    def compare_profiles(a, b):
        """
        Used to compare profiles in lexicographic order.

            Parameters:
                a (np.ndarray): a profile for a matching. An m-vector where profile[i] is the number of applicants who were assigned their i'th pick of job
                b (np.ndarray): a profile for a matching.

            Returns:
                1  if b < a
                -1 if a < b
                0  if a = b
        """
        where = np.where( (a>b) != (a<b) )
        if where[0].size == 0:
            # they are identical
            return 0

        idx = where[0][0]

        if a[idx] < b[idx]:
            return -1
        elif a[idx] > b[idx]:
            return 1
        
    @staticmethod
    def compute_profile_from_result(ranks, matching):
        """
        Computes the profile from the output of the human-friendly algorithm.
        
            Parameters:
            Parameters:
                ranks (dict): a dictionary {[applicant]: {[job]: [ranking]}}
                matching (dict): a dictionary of {[applicant]: [job1, job2, ...]} of selected jobs.
                
            Returns:
                profile (np.ndarray): an m-vector where profile[i] is the number of applicants who were assigned their i'th pick of job
                
        """
        m = len(ranks[list(ranks.keys())[0]])
        profile = np.zeros(m, dtype=int)
        
        # re-order ranks to be increasing by 1, rather than arbitrary ranks
        for applicant in ranks:
            ranks[applicant] = {k: i for i, (k, v) in enumerate(sorted(ranks[applicant].items(), key=lambda item: item[1]))}
        
        for applicant in ranks:
            for job in ranks[applicant]:
                rank = ranks[applicant][job]
                if job in matching[applicant]:
                    profile[rank] += 1
        assert profile.sum() == m
        return profile
