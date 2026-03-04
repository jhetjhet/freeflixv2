from rest_framework.filters import SearchFilter
import operator
from functools import reduce
from django.db import models
from queryset_sequence import QuerySetSequence

class SequenceSearchFilter(SearchFilter):

	def filter_queryset(self, request, querysets, view):
		search_fields = self.get_search_fields(view, request)
		search_terms = self.get_search_terms(request)

		queryset1, queryset2 = querysets

		if not search_fields or not search_terms:
			return QuerySetSequence(queryset1, queryset2)

		# Both models share the same model and so field types (FlixBaseModel), 
		# so the generated lookup strings (e.g., 'title__icontains') 
		# are identical and can be reused for both querysets.
		orm_lookups = [
			self.construct_search(str(search_field), queryset1)
			for search_field in search_fields
		]

		base1, base2 = querysets
		conditions = []
		for search_term in search_terms:
			queries = [
				models.Q(**{orm_lookup: search_term})
				for orm_lookup in orm_lookups
			]
			conditions.append(reduce(operator.or_, queries))
			
		queryset1 = queryset1.filter(reduce(operator.and_, conditions))
		queryset2 = queryset2.filter(reduce(operator.and_, conditions))
		if self.must_call_distinct(queryset1, search_fields):
			queryset1 = distinct(queryset1, base1)
		if self.must_call_distinct(queryset2, search_fields):
			queryset2 = distinct(queryset2, base2)
		return QuerySetSequence(queryset1, queryset2)