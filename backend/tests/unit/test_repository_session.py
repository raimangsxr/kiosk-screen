from sqlalchemy import text

from app.repositories.session import create_database_engine, create_session_factory


def test_session_factory_uses_supplied_engine():
    engine = create_database_engine("sqlite+pysqlite:///:memory:")
    factory = create_session_factory(engine)

    with factory() as session:
        assert session.execute(text("select 1")).scalar_one() == 1

