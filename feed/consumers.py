# from channels.generic.websocket import AsyncJsonWebsocketConsumer
# import json

# class FeedConsumer(AsyncJsonWebsocketConsumer):

# 	async def connect(self):
# 		self.group_name = self.scope['url_route']['kwargs']['tmdb_id']

# 		print('0'*60)
# 		print(self.group_name)
# 		print('0'*60)

# 		await self.channel_layer.group_add(
# 			self.group_name,
# 			self.channel_name
# 		)

# 		await self.accept()

# 	async def disconnect(self, close_code):
# 		await self.channel_layer.group_discard(
# 			self.group_name,
# 			self.channel_name
# 		)

# 	async def receive(self, text_data):
# 		print('x'*60)
# 		print(text_data)
# 		print('x'*60)

# 	async def test_message(self, data):
# 		print('-'*60)
# 		print(data)
# 		print('-'*60)
# 		await self.send(json.dumps(data))