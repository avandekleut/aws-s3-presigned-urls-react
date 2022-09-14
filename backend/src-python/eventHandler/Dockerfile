FROM amazon/aws-lambda-python:latest

RUN yum update -y && \
    yum install -y python3 python3-dev python3-pip gcc && \
    rm -Rf /var/cache/yum
COPY index.py ./
ADD matching_generator matching_generator
COPY requirements.txt ./
RUN pip install -r requirements.txt
RUN echo $(ls -a)
CMD ["index.handler"]