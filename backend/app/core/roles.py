from enum import StrEnum


class Role(StrEnum):
    ADMIN = 'admin'
    LIDER = 'lider'
    ESPECIALISTA = 'especialista'
    GESTOR = 'gestor'
    COLABORADOR = 'colaborador'


class MovementType(StrEnum):
    ENTRADA = 'entrada'
    SALIDA = 'salida'


MANAGE_ITEMS_ROLES = {Role.ADMIN, Role.LIDER, Role.ESPECIALISTA}
REPORT_ROLES = {Role.ADMIN, Role.LIDER, Role.ESPECIALISTA, Role.GESTOR}
ADMIN_ONLY = {Role.ADMIN}
ALL_ROLES = {Role.ADMIN, Role.LIDER, Role.ESPECIALISTA, Role.GESTOR, Role.COLABORADOR}
ALERT_RECIPIENT_ROLES = {Role.ADMIN, Role.LIDER, Role.ESPECIALISTA}
