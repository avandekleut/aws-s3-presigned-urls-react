import numpy as np

from matching_generator.linear_sum_assignment import linear_sum_assignment


class RankMaximalAllocation:
    @classmethod
    def generate_matching(cls, ranks):
        """
        Returns a tuple (applicants, jobs) corresponding to a bipartite graph matching between applicants and jobs.
        
            Parameters:
                ranks (np.ndarray): an n x m matrix of rankings, where ranks[i,j] is the rank of applicant i for job j
        
            Returns:
                applicants: a vector of length min(n, m) of the selected applicants. A vector of indices.
                jobs: a vector of length min(n, m) of the selected jobs. A vector of indices.
                
                The computed matching is essentially [(applicants[0], jobs[0]), applicants[1], jobs[1], ...]
                The retured format is more efficient for indexing operations.
        
        """
        weights = cls.compute_weights(ranks)
        applicants, jobs = linear_sum_assignment(weights)
        return applicants, jobs
    
    @staticmethod
    def compute_weights(ranks):
        """
        Returns a weight matrix the same shape as ranks. Used with linear sum assignment.
        
            Parameters:
                ranks (np.ndarray): an n x m matrix of rankings, where ranks[i,j] is the rank of applicant i for job j

            Returns:
                weights (np.ndarray): an n x m matrix of weights. Selecting at most one element from each row/column of this matrix should result in a minimum sum.
        
        Cited from Greedy Matchings by Robert W. Irving
        https://citeseerx.ist.psu.edu/viewdoc/download;jsessionid=0D4318167ED18A3CE8DF2FB5B2EA8321?doi=10.1.1.119.1747&rep=rep1&type=pdf
        
        > However, a greedy matching can be found by transforming to an instance of the classical
        > maximum weight bipartite matching problem. This involves allo cating a suitably steeply 
        > decreasing sequence of weights to the positions in each applicant's preference list to 
        > ensure that, for any value of i, an applicant who improves from his (i+1)th to his ith 
        > choice would change the weight of applicants who move down from their (i+j)th choice, 
        > for any value of j >= 1. This can be achieved, for example, by assigning a weight of 
        > n^(m-i) to each applicant's ith choice.
        """
        (n, m) = ranks.shape
        
        # we use object to take advantage of numpy's broadcasting
        # and python's unlimited integer representation
        weights = np.array(n, dtype=object)**(np.array(m, dtype=object)-ranks.astype(object))
        
        # negative because the Hungarian algorithm is trying to
        # minimize the costs, and weights are higher for a higher rank
        return -weights
