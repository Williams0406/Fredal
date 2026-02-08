from rest_framework.permissions import BasePermission, SAFE_METHODS



# ==========================
# Utilidades
# ==========================

def user_in_group(user, group_name):
    return user.groups.filter(name=group_name).exists()


# ==========================
# Permisos base
# ==========================

class HasRole(BasePermission):
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_roles = request.user.groups.values_list("name", flat=True)
        return any(role in user_roles for role in self.allowed_roles)

class IsAdmin(BasePermission):
    """
    Administrador total
    """

    def has_permission(self, request, view):
        return request.user and (
            request.user.is_staff or request.user.is_superuser
        )


class ReadOnlyAuthenticated(BasePermission):
    """
    Solo lectura para usuarios autenticados
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.method in SAFE_METHODS
        )


# ==========================
# Trabajo
# ==========================

class TrabajoPermission(BasePermission):
    """
    Reglas:
    - Admin / Jefe de Técnicos → CRUD
    - Técnico → ver + actualizar (PUT/PATCH)
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_staff:
            return True

        if user_in_group(user, "Jefe de Tecnicos"):
            return True

        if user_in_group(user, "Tecnico"):
            return request.method in ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH"]

        return request.method in SAFE_METHODS


# ==========================
# Cambio de Equipo
# ==========================

class CambioEquipoPermission(BasePermission):
    """
    Reglas:
    - Admin / Jefe de Almaceneros / Almacenero → CRUD
    - Otros → solo lectura
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_staff:
            return True

        if user_in_group(user, "Jefe de Almaceneros"):
            return True

        if user_in_group(user, "Almacenero"):
            return True

        if user_in_group(user, "Tecnico"):
            return request.method in ["POST", "GET", "HEAD", "OPTIONS"]

        return request.method in SAFE_METHODS


# ==========================
# Compras
# ==========================

class CompraPermission(BasePermission):
    """
    Reglas:
    - Admin / ManageCompras → CRUD
    - Otros → solo lectura
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_staff:
            return True

        if user_in_group(user, "ManageCompras"):
            return True

        return request.method in SAFE_METHODS


# ==========================
# Stock / Items
# ==========================

class ItemPermission(BasePermission):
    """
    Reglas:
    - Admin / Jefe de Almaceneros → CRUD
    - Almacenero → ver
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_staff:
            return True

        if user_in_group(user, "Jefe de Almaceneros"):
            return True

        if user_in_group(user, "Almacenero"):
            return request.method in SAFE_METHODS

        if user_in_group(user, "Tecnico"):
            return request.method in SAFE_METHODS

        return False


# ==========================
# Maquinaria / Trabajador
# ==========================

class CatalogoPermission(BasePermission):
    """
    Catálogos maestros:
    - Admin → CRUD
    - Otros → solo lectura
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_staff:
            return True

        return request.method in SAFE_METHODS
