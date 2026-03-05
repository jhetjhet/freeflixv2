from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class FlixPagination(PageNumberPagination):

	def get_paginated_response(self, data):
		has_next = self.page.has_next()
		has_previous = self.page.has_previous()

		return Response({
			'count': self.page.paginator.count,
			'number': self.page.number,
			'total_pages': self.page.paginator.num_pages,
			'next': self.get_next_link(),
			'next_page_number': self.page.next_page_number() if has_next else None,
			'previous': self.get_previous_link(),
			'previous_page_number': self.page.previous_page_number() if has_previous else None,
			'results': data,
		})