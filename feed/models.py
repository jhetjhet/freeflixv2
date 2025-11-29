from django.db import models
from django.conf import settings
from django.utils import timezone
from flix.models import (
	Movie,
	Series,
)
from django.core.validators import MinValueValidator, MaxValueValidator

class RatingModel(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
	value = models.DecimalField(
		max_digits=4, 
		decimal_places=2, 
		validators=[
			MinValueValidator(1), 
			MaxValueValidator(10),
		]
	)
	date_rated = models.DateTimeField(default=timezone.now)

	class Meta:
		abstract = True

class CommentModel(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
	comment = models.TextField()
	date = models.DateTimeField(default=timezone.now)

	class Meta:
		abstract = True

class MovieRating(RatingModel):
	flix = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='movie_ratings')

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['user', 'flix'], name='movie-user-flix-unq'),
		]

class SeriesRating(RatingModel):
	flix = models.ForeignKey(Series, on_delete=models.CASCADE, related_name='series_ratings')

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['user', 'flix'], name='series-user-flix-unq'),
		]




class MovieCommentRating(RatingModel):
	comment = models.ForeignKey('MovieComment', on_delete=models.CASCADE, related_name='movie_comment_ratings')

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['user', 'comment'], name='movie-comment-user-flix-unq'),
		]

class MovieReplyCommentRating(RatingModel):
	comment = models.ForeignKey('MovieReplyToComment', on_delete=models.CASCADE, related_name='movie_reply_comment_ratings')

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['user', 'comment'], name='movie-reply-comment-user-flix-unq'),
		]

class SeriesCommentRating(RatingModel):
	comment = models.ForeignKey('SeriesComment', on_delete=models.CASCADE, related_name='series_comment_ratings')

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['user', 'comment'], name='series-comment-user-flix-unq'),
		]

class SeriesReplyCommentRating(RatingModel):
	comment = models.ForeignKey('SeriesReplyToComment', on_delete=models.CASCADE, related_name='series_reply_comment_ratings')

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['user', 'comment'], name='series-reply-comment-user-flix-unq'),
		]



class MovieComment(CommentModel):
	flix = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='movie_comments')

class MovieReplyToComment(CommentModel):
	reply_to = models.ForeignKey(MovieComment, on_delete=models.CASCADE, related_name='movie_comment_replys')

class SeriesComment(CommentModel):
	flix = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='series_comments')

class SeriesReplyToComment(CommentModel):
	reply_to = models.ForeignKey(SeriesComment, on_delete=models.CASCADE, related_name='series_comment_replys')