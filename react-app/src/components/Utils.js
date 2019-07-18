import * as posenet from '@tensorflow-models/posenet';
import VPTreeFactory from 'vptree';
import {sortBy} from 'lodash';
import l2norm from 'compute-l2norm';


const color = 'aqua';
const boundingBoxColor = 'red';
const lineWidth = 2;


export function drawBoundingBox(keypoints, ctx) {
  const boundingBox = posenet.getBoundingBox(keypoints);

  ctx.rect(
    boundingBox.minX, boundingBox.minY,
    boundingBox.maxX - boundingBox.minX,
    boundingBox.maxY - boundingBox.minY
  );

  ctx.strokeStyle = boundingBoxColor;
  ctx.stroke();
}

export function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const {y, x} = keypoint.position;
    drawPoint(ctx, y * scale, x * scale, 3, color);
  }
}

export function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints =
    posenet.getAdjacentKeyPoints(keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
      toTuple(keypoints[0].position),
      toTuple(keypoints[1].position),
      color,
      scale,
      ctx
    );
  });
}

function toTuple({y, x}) {
  return [y, x];
}

export function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawPoses(ctx, poses, video) {

  const videoWidth = 400;
  const videoHeight = 400;

  let minPoseConfidence = 0.1;
  let minPartConfidence = 0.5;

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
}

// poseVector1 and poseVector2 are 52-float vectors composed of:
// Values 0-33: are x,y coordinates for 17 body parts in alphabetical order
// Values 34-51: are confidence values for each of the 17 body parts in alphabetical order
// Value 51: A sum of all the confidence values
// Again the lower the number, the closer the distance
function weightedDistanceMatching(poseVector1, poseVector2) {
  const partsEnd = parts.length * 2;
  const scoresEnd = partsEnd + parts.length;
  let vector1PoseXY = poseVector1.slice(0, partsEnd);
  let vector1Confidences = poseVector1.slice(partsEnd, scoresEnd);
  let vector1ConfidenceSum = poseVector1.slice(scoresEnd, scoresEnd + 1);

  let vector2PoseXY = poseVector2.slice(0, partsEnd);

  // First summation
  let summation1 = 1 / vector1ConfidenceSum;

  // Second summation
  let summation2 = 0;
  for (let i = 0; i < vector1PoseXY.length; i++) {
    let tempConf = Math.floor(i / 2);
    let tempSum =
      vector1Confidences[tempConf] *
      Math.abs(vector1PoseXY[i] - vector2PoseXY[i]);
    summation2 = summation2 + tempSum;
  }

  return summation1 * summation2;
}

export async function buildVPTree(poseData) {
  // Initialize our vptree with our images’ pose data and a distance function
  return new Promise(resolve => {
    resolve(VPTreeFactory.build(poseData, weightedDistanceMatching));
  });
}

const parts = [
  'nose',
  // 'leftEye',
  // 'rightEye',
  // 'leftEar',
  // 'rightEar',

  'leftShoulder',
  'rightShoulder',

  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',

  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
];
export function convertPoseToVector(pose) {
  const keypoints = sortBy(normalizeKeypoints(pose), 'part');
  const vector = keypoints.reduce((acc, keypoint) => {
    if (parts.includes(keypoint.part)) {
      acc.push(keypoint.normalizedPosition.x);
      acc.push(keypoint.normalizedPosition.y);
    }
    return acc;
  }, []);

  const scoreSum = keypoints.reduce((acc, keypoint) => {
    vector.push(keypoint.score);
    return acc + keypoint.score;
  }, 0);

  vector.push(scoreSum);
  return l2normPoseVector(vector);
}

function normalizeKeypoints(pose) {
  const boundingBox = posenet.getBoundingBox(pose.keypoints);

  const normalizedPoints = pose.keypoints.map(keypoint => {
    return {
      ...keypoint,
      normalizedPosition: {
        x: keypoint.position.x - boundingBox.minX,
        y: keypoint.position.y - boundingBox.minY,
      },
    };
  });
  return normalizedPoints;
}

function l2normPoseVector(vector) {
  const norm = l2norm(vector);
  const normalized = vector.map(value => (value / norm) * (value / norm));
  // console.log(normalized.reduce((acc, value) => acc + value, 0))
  return normalized;
}

export function findMostSimilarMatch(vptree, userPose) {
  const pose = convertPoseToVector(userPose);
  // search the vp tree for the image pose that is nearest (in cosine distance) to userPose
  let nearestImage = vptree.search(pose);

  // return index (in relation to poseData) of nearest match.
  return {
    index: nearestImage[0].i,
    distance: nearestImage[0].d,
    category: 'unknown',
  };
}
