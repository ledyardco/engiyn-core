from setuptools import setup

setup(
    name="engiyn-sdk",
    version="0.1.0",
    description="Engiyn plugin SDK",
    py_modules=["engiyn_sdk"],
    install_requires=[
        "jsonschema",
        "flask",
    ],
    python_requires=">=3.7",
)
