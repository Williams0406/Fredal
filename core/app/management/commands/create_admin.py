from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from app.models import Trabajador, PerfilUsuario

User = get_user_model()

class Command(BaseCommand):
    help = "Crea el usuario admin si no existe"

    def handle(self, *args, **options):
        username = "admin"

        if User.objects.filter(username=username).exists():
            self.stdout.write("✔ Admin ya existe")
            return

        trabajador, _ = Trabajador.objects.get_or_create(
            codigo="ADMIN001",
            defaults={
                "nombres": "Administrador",
                "apellidos": "Sistema",
                "dni": "99999999",
                "puesto": "Administrador",
            }
        )

        user = User.objects.create_superuser(
            username=username,
            email="admin@alejandro.com",
            password="admin123"
        )

        PerfilUsuario.objects.get_or_create(
            user=user,
            trabajador=trabajador
        )

        group, _ = Group.objects.get_or_create(name="admin")
        user.groups.add(group)

        self.stdout.write("✅ Usuario admin creado")
