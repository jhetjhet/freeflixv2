from rest_framework.permissions import BasePermission, SAFE_METHODS


class FlixModelPermission(BasePermission):
    perms_map = {
        'GET': 'view',
        'HEAD': 'view',
        'OPTIONS': 'view',
        'POST': 'add',
        'PUT': 'change',
        'PATCH': 'change',
        'DELETE': 'delete',
    }

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        action = self.perms_map.get(request.method)
        if not action:
            return False

        models = self.get_permission_models(view)
        return all(
            user.has_perm(f'{model._meta.app_label}.{action}_{model._meta.model_name}')
            for model in models
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)

    def get_permission_models(self, view):
        models = getattr(view, 'permission_models', None)
        if models:
            return models

        model = getattr(view, 'permission_model', None)
        if model:
            return [model]

        queryset = getattr(view, 'queryset', None)
        if queryset is not None:
            return [queryset.model]

        raise AttributeError(f'{view.__class__.__name__} must define permission_model or permission_models')