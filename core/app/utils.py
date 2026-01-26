from .models import Auditoria


def registrar_auditoria(user, accion, instance):
    Auditoria.objects.create(
        usuario=user,
        accion=accion,
        modelo=instance.__class__.__name__,
        objeto_id=instance.id,
    )
