from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class FlixPagination(PageNumberPagination):

	def get_paginated_response(self, data):
		return Response({
			'count': self.page.paginator.count,
			'number': self.page.number,
			'next': self.get_next_link(),
			'previous': self.get_previous_link(),
			'results': data,
		})