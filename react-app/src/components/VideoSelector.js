import React from 'react';
import * as posenet from '@tensorflow-models/posenet';
import {
 drawBoundingBox,
 drawKeypoints,
 drawSkeleton,
 drawSegment,
 drawPoint,
} from './Utils';

class VideoSelector extends React.Component {
  state = {
  };

  render() {
    return (
      <div>
      <h1>Hello</h1>
      <video id="video" width="400" height="400" muted controls>
       <source src="curry_cropped.mp4" type="video/mp4"/>
      </video>
      <canvas id="output" width="400" height="400"/>
      </div>
    );
  }

  setup = async() => {
    const net = await posenet.load({
      architecture: 'ResNet50',
      outputStride: 32,
      inputResolution: 257,
      quantBytes: 2
    });
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
    video.playbackRate = 0.2;
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

      const videoWidth = 400;
      const videoHeight = 400;

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
        if (score >= minPoseConfidence) {
          drawKeypoints(keypoints, minPartConfidence, ctx);
          drawSkeleton(keypoints, minPartConfidence, ctx);
          drawBoundingBox(keypoints, ctx);
        }
      });

      requestAnimationFrame(poseDetectionFrame);

    }

    processing = true;
    poseDetectionFrame();
  }

}

export default VideoSelector;
