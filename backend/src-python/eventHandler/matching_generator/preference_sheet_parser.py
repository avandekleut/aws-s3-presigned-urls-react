import numpy as np
import pandas as pd

class PreferenceSheetParser:
    @staticmethod
    def generate_ranks(filename, ignore_sheet_names=['Inventory', 'Black Six', 'Info', 'Participants']):
        xlsx = pd.ExcelFile(filename)
        rankings = {}

        total_quantity = xlsx.parse()['Total Quantity'].sum()
        lowest_rank = total_quantity - 1

        for sheet_name in xlsx.sheet_names:
            if sheet_name in ignore_sheet_names:
                continue
                
            rankings[sheet_name] = {}

            df = pd.read_excel(xlsx, sheet_name)
            
            # Need to handle mistake in sheet where the 'Around the World' set appears twice
            df['Total Quantity'] = np.where(df['Set Name'] == 'Around the World', 2, df['Total Quantity'])
            df = df.drop_duplicates('Set Name')  # type: ignore
            
            # Normalize rankings so that they begin at 0 instead of 1 
            df['Preference'] -= df['Preference'].min()


            for index, row in df.iterrows():
                rank, qty, name = row['Preference'], row['Total Quantity'], row['Set Name']
                
                

                rankings[sheet_name][name] = rank

                # all duplicates should get the lowest rank to avoid chance of duplication
                # but should also respect the original rank of the set (duplicates should not
                # all be considered equal)
                # for each quantity of duplication, we reduce the rank by the number of items 
                # to avoid getting duplicates of the same set, but add the rank to maintain
                # the original relative order
                if qty > 1:
                    for duplicate in range(1, qty):
                        rankings[sheet_name][f'{name}_duplicate_{duplicate}'] = duplicate*lowest_rank + rank
            
#             # the method of reducing duplication probability above results in ranks that are much lower than 
#             # the total quantity of items. We can thus re-normalize ranks to be between 0 and total_quantity-1
#             rankings[sheet_name] = {k: i for i, (k, v) in enumerate(sorted(rankings[sheet_name].items(), key=lambda item: item[1]))}

        assert all(map(lambda e: len(e) == total_quantity, rankings.values()))
        return rankings


