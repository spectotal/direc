from src.app import greet


def test_greet() -> None:
    assert greet("direc") == "hello direc"
