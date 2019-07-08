import React from 'react';
import * as posenet from '@tensorflow-models/posenet';

class VideoSelector extends React.Component {
  state = {
  };

  render() {
    return (
      <div>
      <h1>Hello</h1>
      <video id="video" width="600" height="340" muted controls>
       <source src="curry.mp4" type="video/mp4"/>
      </video>
      <canvas id="output" width="600" height="340"/>
      </div>
    );
  }

  setup = async() => {
    const net = await posenet.load();
    //this.poseData = await loadPoseData();
    console.log('LOADED ALL POSES!!!');
    //this.setState({ loadedPoses: true });
    return net;
  };

  getVideo() {
    const video = document.getElementById('video');
    return video;
  }

  async componentDidMount() {
    const net = await this.setup();
    const video = this.getVideo();
    video.play();
    this.getPoses(video, net);
  }

  getPoses(video, net) {
    let processing = false;
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    video.onended = function(e) {
      processing = false;
    };

    let poseDetectionFrame = async () => {
      if (processing === false) {
        return;
      }
      let poses = [];
      let minPoseConfidence = 0.1;
      let minPartConfidence = 0.5;
      const pose = await net.estimateSinglePose(video, {
        flipHorizontal: true,
        decodingMethod: 'single-person'
      });
      poses = poses.concat(pose);

      const videoWidth = 600;
      const videoHeight = 340;

      const color = 'aqua';
      const boundingBoxColor = 'red';
      const lineWidth = 2;

      ctx.clearRect(0, 0, videoWidth, videoHeight);

      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();

      // For each pose (i.e. person) detected in an image, loop through the poses
      // and draw the resulting skeleton and keypoints if over certain confidence
      // scores
      poses.forEach(({score, keypoints}) => {
        console.info(score);
        console.info(keypoints);
        if (score >= minPoseConfidence) {
          console.info('draw');
          drawKeypoints(keypoints, minPartConfidence, ctx);
          drawSkeleton(keypoints, minPartConfidence, ctx);
          drawBoundingBox(keypoints, ctx);
        }
      });

      requestAnimationFrame(poseDetectionFrame);

      function drawBoundingBox(keypoints, ctx) {
        const boundingBox = posenet.getBoundingBox(keypoints);

        ctx.rect(
            boundingBox.minX, boundingBox.minY, boundingBox.maxX - boundingBox.minX,
            boundingBox.maxY - boundingBox.minY);

        ctx.strokeStyle = boundingBoxColor;
        ctx.stroke();
      }

      function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
        for (let i = 0; i < keypoints.length; i++) {
          const keypoint = keypoints[i];

          if (keypoint.score < minConfidence) {
            continue;
          }

          const {y, x} = keypoint.position;
          drawPoint(ctx, y * scale, x * scale, 3, color);
        }
      }

      function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
        const adjacentKeyPoints =
            posenet.getAdjacentKeyPoints(keypoints, minConfidence);

        adjacentKeyPoints.forEach((keypoints) => {
          drawSegment(
              toTuple(keypoints[0].position), toTuple(keypoints[1].position), color,
              scale, ctx);
        });
      }

      function toTuple({y, x}) {
        return [y, x];
      }

      function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
        ctx.beginPath();
        ctx.moveTo(ax * scale, ay * scale);
        ctx.lineTo(bx * scale, by * scale);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.stroke();
      }

      function drawPoint(ctx, y, x, r, color) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }

    }

    processing = true;
    poseDetectionFrame();
  }

}

export default VideoSelector;
