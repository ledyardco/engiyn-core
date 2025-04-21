from setuptools import setup, find_packages

setup(
    name="engiyn-core",
    version="0.1.2",
    description="Engiyn Core - Multi-cloud, AI/IDE integration engine",
    author="Ledyardco",
    author_email="info@ledyardco.com",
    url="https://github.com/ledyardco/engiyn-core",
    packages=find_packages(exclude=["tests", "templates"]),
    include_package_data=True,
    install_requires=[
        "jsonschema",
        "flask",
        "click",
    ],
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
    ],
    python_requires=">=3.7",
)
