import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('.env')

async def check():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    calls = await db.calls.find({}, {'_id': 0}).to_list(10)
    print('Total calls:', len(calls))
    for c in calls:
        print(c)

asyncio.run(check())