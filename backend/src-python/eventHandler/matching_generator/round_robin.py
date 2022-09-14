import numpy as np

class RoundRobin:
    @staticmethod
    def generate_matching(ranks):
        (n, m) = ranks.shape

        available_jobs = list(range(m))

        maximum_available_assignments = min(n, m)

        assigned_jobs = np.empty(maximum_available_assignments ,dtype=int)

        lottery_order = np.random.choice(np.arange(n), maximum_available_assignments, replace=False)  # type: ignore
        for i in range(maximum_available_assignments):
            applicant = lottery_order[i]

            jobs = np.arange(m)
            ranks_for_applicant = ranks[applicant]

            # recall that ranks[i] is the *rank* for items 0, 1, 2, etc
            # so if we want to get the actual jobs they want in order, we
            # need to argsort
            jobs_in_preferred_order = jobs[np.argsort(ranks_for_applicant)]

            for j in jobs_in_preferred_order:
                if j in available_jobs:
                    available_jobs.remove(j)
                    assigned_jobs[i] = j

                    break
        return lottery_order, assigned_jobs