pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "dhirajsathe20/gcompro"
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Verify Environment') {
            steps {
                sh '''
                pwd
                ls -la
                git --version
                node -v
                npm -v
                docker --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build Next.js') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                echo "Building Docker Image..."

                docker build \
                    -t ${DOCKER_IMAGE}:${BUILD_NUMBER} \
                    -t ${DOCKER_IMAGE}:latest \
                    .
                '''
            }
        }

        stage('Push Docker Image to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker-credential',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {

                    sh '''
                    echo "$DOCKER_PASSWORD" | docker login \
                        -u "$DOCKER_USERNAME" \
                        --password-stdin

                    docker push ${DOCKER_IMAGE}:${BUILD_NUMBER}
                    docker push ${DOCKER_IMAGE}:latest

                    docker logout
                    '''
                }
            }
        }

stage('Deploy to Frontend') {
    steps {
        sshagent(['frontend-ec2-ssh']) {
            sh '''
                ssh -o StrictHostKeyChecking=no ubuntu@15.207.98.120 <<EOF

                docker pull ${DOCKER_IMAGE}:${BUILD_NUMBER}

                docker stop gcompro || true
                docker rm gcompro || true

                docker run -d \
                    --name gcompro \
                    --env-file /home/ubuntu/gcompro.env \
                    -p 3000:3000 \
                    ${DOCKER_IMAGE}:${BUILD_NUMBER}

                docker ps

                EOF
            '''
        }
    }
}

    }

    
    post {

        success {
            echo '✅ Frontend Build + Docker Image Push Successful'
        }

        failure {
            echo '❌ Frontend Build / Docker Push / Deployment Failed'
        }

    }
}
