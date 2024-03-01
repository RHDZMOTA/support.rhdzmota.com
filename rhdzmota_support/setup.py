import os
from setuptools import setup, find_namespace_packages

# Environ variables
SUPPORT_CODEBASE_PATH = os.environ.get(
    "SUPPORT_CODEBASE_PATH",
    default=os.path.join("src", "main")
)

with open("README.md", "r") as file:
    readme = file.read()


with open("LICENSE", "r") as file:
    license_content = file.read()

with open("requirements.txt", "r") as file:
    requirements = [req for req in file.read().splitlines() if req and not req.startswith("#")]

version_filename = "support_version"
version_filepath = os.path.join(
    SUPPORT_CODEBASE_PATH,
    "rhdzmota",
    "support",
    version_filename,
)

with open(version_filepath, "r") as file:
    version = file.read().strip()

setup(
    name="rhdzmota_support",
    version=version,
    description=(
        "RHDZMOTA Support"
    ),
    long_description=readme,
    long_description_content_type="text/markdown",
    author="Rodrigo H. Mota",
    author_email="info@rhdzmota.com",
    url="https://github.com/rhdzmota/support.rhdzmota.com",
    # https://pypi.org/classifiers/
    classifiers=[
        "Typing :: Typed",
        "Topic :: Scientific/Engineering",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.10",
    ],
    package_dir={
        "": SUPPORT_CODEBASE_PATH,
    },
    package_data={
        "": [
            os.path.join(
                "rhdzmota",
                "support",
                "support_version",
            ),
        ]
    },
    include_package_data=True,
    packages=[
        package
        for package in find_namespace_packages(where=".")
        if package.startswith("rhdzmota")
    ],
    install_requires=requirements,
    python_requires=">=3.10, <4",
    license=license_content,
    zip_safe=False,
)
