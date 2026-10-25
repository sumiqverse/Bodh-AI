"""Add auth student credentials, class teacher and join codes, and PostgreSQL RLS.

Revision ID: 0002_auth_classes_rls
Revises: 0001_initial_schema
Create Date: 2026-10-25 18:40:00

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_auth_classes_rls"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Update Users with student credentials and lockout tracking
    op.add_column("users", sa.Column("username", sa.String(50), nullable=True))
    op.create_unique_constraint("uq_users_username", "users", ["username"])
    op.create_index("ix_users_username", "users", ["username"])

    op.add_column("users", sa.Column("pin_hash", sa.String(255), nullable=True))
    op.add_column(
        "users",
        sa.Column("is_minor", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))

    # 2. Update Guardians with full name
    op.add_column(
        "guardians",
        sa.Column("name", sa.String(150), nullable=False, server_default=""),
    )

    # 3. Update Classes with name, teacher_id, and join_code
    op.add_column(
        "classes",
        sa.Column("name", sa.String(100), nullable=False, server_default="Class Section"),
    )
    op.add_column(
        "classes",
        sa.Column(
            "teacher_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,  # Initially nullable to handle existing rows if any
        ),
    )
    op.add_column(
        "classes",
        sa.Column("join_code", sa.String(12), nullable=True),
    )
    op.create_unique_constraint("uq_classes_join_code", "classes", ["join_code"])
    op.create_index("ix_classes_join_code", "classes", ["join_code"])
    op.create_index("idx_classes_teacher", "classes", ["teacher_id"])

    # 4. PostgreSQL Row-Level Security (RLS) as defense-in-depth
    if is_postgres:
        # Classes: Teacher sees only their own classes, admin sees all
        op.execute("ALTER TABLE classes ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE classes FORCE ROW LEVEL SECURITY;")
        op.execute(
            """
            CREATE POLICY classes_teacher_policy ON classes FOR ALL
            USING (
                teacher_id = NULLIF(current_setting('app.user_id', true), '')::uuid
                OR current_setting('app.role', true) = 'admin'
            );
            """
        )

        # Enrollments: Student sees own; Teacher sees students in class; Admin sees all
        op.execute("ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;")
        op.execute(
            """
            CREATE POLICY enrollments_policy ON enrollments FOR ALL
            USING (
                student_id = NULLIF(current_setting('app.user_id', true), '')::uuid
                OR EXISTS (
                    SELECT 1 FROM classes c
                    WHERE c.id = enrollments.class_id
                    AND c.teacher_id = NULLIF(current_setting('app.user_id', true), '')::uuid
                )
                OR current_setting('app.role', true) = 'admin'
            );
            """
        )

        # Attempts: Student sees own; Teacher sees attempts in class; Admin sees all
        op.execute("ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE attempts FORCE ROW LEVEL SECURITY;")
        op.execute(
            """
            CREATE POLICY attempts_policy ON attempts FOR ALL
            USING (
                student_id = NULLIF(current_setting('app.user_id', true), '')::uuid
                OR EXISTS (
                    SELECT 1 FROM enrollments e
                    JOIN classes c ON c.id = e.class_id
                    WHERE e.student_id = attempts.student_id
                    AND c.teacher_id = NULLIF(current_setting('app.user_id', true), '')::uuid
                )
                OR current_setting('app.role', true) = 'admin'
            );
            """
        )

        # Mastery: Student sees own; Teacher sees mastery in class; Admin sees all
        op.execute("ALTER TABLE mastery ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE mastery FORCE ROW LEVEL SECURITY;")
        op.execute(
            """
            CREATE POLICY mastery_policy ON mastery FOR ALL
            USING (
                student_id = NULLIF(current_setting('app.user_id', true), '')::uuid
                OR EXISTS (
                    SELECT 1 FROM enrollments e
                    JOIN classes c ON c.id = e.class_id
                    WHERE e.student_id = mastery.student_id
                    AND c.teacher_id = NULLIF(current_setting('app.user_id', true), '')::uuid
                )
                OR current_setting('app.role', true) = 'admin'
            );
            """
        )

        # Consents: Student sees only their own consent records; Admin sees all
        op.execute("ALTER TABLE consents ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE consents FORCE ROW LEVEL SECURITY;")
        op.execute(
            """
            CREATE POLICY consents_policy ON consents FOR ALL
            USING (
                student_id = NULLIF(current_setting('app.user_id', true), '')::uuid
                OR current_setting('app.role', true) = 'admin'
            );
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("DROP POLICY IF EXISTS consents_policy ON consents;")
        op.execute("ALTER TABLE consents DISABLE ROW LEVEL SECURITY;")

        op.execute("DROP POLICY IF EXISTS mastery_policy ON mastery;")
        op.execute("ALTER TABLE mastery DISABLE ROW LEVEL SECURITY;")

        op.execute("DROP POLICY IF EXISTS attempts_policy ON attempts;")
        op.execute("ALTER TABLE attempts DISABLE ROW LEVEL SECURITY;")

        op.execute("DROP POLICY IF EXISTS enrollments_policy ON enrollments;")
        op.execute("ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;")

        op.execute("DROP POLICY IF EXISTS classes_teacher_policy ON classes;")
        op.execute("ALTER TABLE classes DISABLE ROW LEVEL SECURITY;")

    op.drop_index("idx_classes_teacher", table_name="classes")
    op.drop_index("ix_classes_join_code", table_name="classes")
    op.drop_constraint("uq_classes_join_code", "classes", type_="unique")
    op.drop_column("classes", "join_code")
    op.drop_column("classes", "teacher_id")
    op.drop_column("classes", "name")

    op.drop_column("guardians", "name")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
    op.drop_column("users", "is_minor")
    op.drop_column("users", "pin_hash")
    op.drop_column("users", "username")
