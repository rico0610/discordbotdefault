# import sys
# import os
# import openai
# import pinecone
# #FOR TESTING
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

# query = sys.argv[1]

# embed_model = 'text-embedding-ada-002'

# index_name = 'notes-embeddings'

# try:
#     index = pinecone.Index(index_name)
#     index.describe_index_stats()

#     res = openai.Embedding.create(
#         input=[query],
#         engine=embed_model
#     )

#     xq = res['data'][0]['embedding']
#     metadata = None

#     limit = 3750

#     def retrieve(query):
#         res = openai.Embedding.create(
#             input=[query],
#             engine=embed_model
#         )
#         xq = res['data'][0]['embedding']
#         res = index.query(xq, top_k=3, include_metadata=True)
#         contexts = [
#             x['metadata']['NOTES'] for x in res['matches']
#         ]
#         return contexts

#     data_to_pass_back = retrieve(query)
#     output = data_to_pass_back
#     print(output)

# except Exception as e:
#     print(f"An error occurred: {e}")
#     sys.stdout.flush()