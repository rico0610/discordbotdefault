# import sys
# import os
# import pandas as pd
# import openai
# import pinecone
# from time import sleep
# # FOR TESTING
# import json

# with open('config.json') as f:
#     config = json.load(f)

# openai.api_key = config['openAI']
# # initialize Pinecone client
# pinecone.init(
#     api_key= config['pineconeKey'],
#     environment= config['pineconeEnv']
# )

# # openai.api_key = os.environ.get('openAI')

# # pinecone.init(
# #     api_key=os.environ.get('pineconeKey'),
# #     environment=os.environ.get('pineconeEnv')
# # )

# input_datapath = sys.argv[1]
# df = pd.read_excel(input_datapath)

# pinecone_index_name = 'notes-embeddings'

# embed_model = 'text-embedding-ada-002'

# # creating embeddings for notes
# batch_size = 100
# done = False

# try:
#     if pinecone_index_name in pinecone.list_indexes():
#         print(f"Index '{pinecone_index_name}' already exists. Deleting the index...")
#         pinecone.delete_index(pinecone_index_name)

#     pinecone.create_index(
#         pinecone_index_name,
#         dimension=1536,
#         metric='cosine',
#         metadata_config={'indexed': ['NOTES']}
#     )

#     index = pinecone.Index(pinecone_index_name)

#     for i in range(0, len(df), batch_size):
#         i_end = min(len(df), i+batch_size)
#         df_batch = df.iloc[i:i_end]
#         ids_batch = list(df_batch.index)
#         texts = df_batch['NOTES'].tolist()

#         try:
#             res = openai.Embedding.create(input=texts, engine=embed_model)
#             embeddings = [record['embedding'] for record in res['data']]
#         except:
#             done = False
#             while not done:
#                 sleep(5)
#                 try:
#                     res = openai.Embedding.create(input=texts, engine=embed_model)
#                     embeddings = [record['embedding'] for record in res['data']]
#                     done = True
#                 except:
#                     pass
#         embeds = [record['embedding'] for record in res['data']]

#         to_upsert = [(str(idx), embeds[i], df_batch.iloc[i].to_dict()) for i, idx in enumerate(ids_batch)]
#         index.upsert(vectors=to_upsert)

#     print(f"Number of embeddings uploaded: {len(df)}")

# except Exception as e:
#     print(f"An error occurred: {e}")
#     sys.stdout.flush()