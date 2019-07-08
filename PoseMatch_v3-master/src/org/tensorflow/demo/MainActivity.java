package org.tensorflow.demo;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.os.Bundle;
import android.os.Environment;
import android.support.multidex.MultiDex;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.Toast;
import org.opencv.android.OpenCVLoader;
import org.tensorflow.demo.env.ImageUtils;
import org.tensorflow.demo.env.Logger;
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Random;

public class MainActivity extends AppCompatActivity {
    public static final int REQUEST_CODE_MODEL_POSE = 1;
    public static final int REQUEST_POSE_IMAGE = 2;

    public static final String EXTRA_IMAGE = "INUPUT_IMAGE";
    public static final String EXTRA_MODEL_POSE = "MODEL_POSE" ;
    public static final String REFRESH_MODELS = "REFRESH_MODELS";
    public static final String MODEL_POSES = "MODEL_POSES";
    private static final Logger LOGGER = new Logger();
    private ImageView imageView;
    private Bitmap poseImage = null;
    static {
        if(!OpenCVLoader.initDebug()){
            Log.e(CameraActivity.TAG, "OpenCV not loaded");
        } else {
            Log.e(CameraActivity.TAG, "OpenCV loaded");
        }
    }
    private Toolbar myToolbar;
    private File pictureFile;
    private String apiResult = "";

    private Button butAddModel;

    private ServerInterface server = new ServerInterface();
    private ArrayList<String> modelPoses = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        MultiDex.install(this);
        setContentView(R.layout.activity_main);

        modelPoses = server.getAllModels(this);

        butAddModel = (Button) findViewById(R.id.add_model);
        butAddModel.setEnabled(false);

        imageView = (ImageView) findViewById(R.id.imageViewPose);

        myToolbar = (Toolbar) findViewById(R.id.my_toolbar);
        setSupportActionBar(myToolbar);

        DrawerUtil.getDrawer(this, myToolbar);

        // TODO move key to config-file
        String algoKey = Helper.getConfigValue(this, "algoKey");
        String algoUrl = "bilgeckers/OpTFpy3_v2/1.0.5";

        //String algoInput = "\"{\"img\": \"jochen_foto1.jpg\"}\""; // {"img":"jochen_foto1.jpg"}
        String algoInput = "{"
                + "\"img_file\":\"data://bilgeckers/multiperson_matching/jochen_foto1.jpg\""
                + "}";


    }





    public void startCameraView(View view) {
        Intent intent = new Intent(this, DetectorActivity.class );
        // Start CameraView DetectorActivity and signal .this when user clicks takePicture() -> onActivityResult() is triggered.
        this.startActivityForResult(intent, MainActivity.REQUEST_POSE_IMAGE);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        LOGGER.i("#######welle hier , resultcode= " + resultCode );

        if (requestCode == REQUEST_POSE_IMAGE) {
            if(resultCode == RESULT_OK) {
                LOGGER.e("Pose image ontvangennnn");

                final Intent data1 = data;

                //pictureFile = (File) data.getExtras().get(MainActivity.EXTRA_IMAGE);
                //Bitmap poseBitMap = (Bitmap) data1.getExtras().get(MainActivity.EXTRA_IMAGE);

                // Aspect ratio 3:4
                LOGGER.e("--Rescaling bitmappppp");
                poseImage = ImageFrameHolder.getInstance().getFrame(); // full size BitMap
                poseImage = Bitmap.createScaledBitmap(poseImage, 1366, 1024, true );

                // Rotate the bitmap
                Matrix matrix = new Matrix();
                // setup rotation degree
                matrix.postRotate(90);
                poseImage = Bitmap.createBitmap(poseImage, 0, 0, poseImage.getWidth(), poseImage.getHeight(), matrix, true);

                // Make random filename for one server/cloud
                // Get timestamp
                String timestamp = new SimpleDateFormat("yyyy-MM-dd-HH-mm-ss").format(new Date());

                // Generate random id
                Random rand = new Random();
                int randomNum = rand.nextInt();


                String randomFileName = timestamp + randomNum + ".png"; //+ randomNum;
                LOGGER.e("Randiom id: " + randomFileName);

                ImageUtils.saveBitmap(poseImage, randomFileName);
                //String path_recorded_img = Environment.getExternalStorageDirectory().getAbsolutePath() + File.separator + "tensorflow/preview.png";
                String path_recorded_img = Environment.getExternalStorageDirectory().getAbsolutePath() + File.separator + "tensorflow/"+ randomFileName;


                pictureFile = new File(path_recorded_img);
                LOGGER.e("--Bitmappppp Saved");
                LOGGER.e("Saved image: " + path_recorded_img);

                LOGGER.e("image name: " + pictureFile.getName());

                // start new activity Choose Model Pose (to server)
                LOGGER.i("--Start ChooseModel Intent");
                Intent intent = new Intent(this, ChooseModelPose.class);
                intent.putExtra(MainActivity.MODEL_POSES, modelPoses);
                this.startActivityForResult(intent, REQUEST_CODE_MODEL_POSE);
            }
        }

        if (requestCode == REQUEST_CODE_MODEL_POSE) {

            if(resultCode == RESULT_OK) {

                if((int) data.getExtras().get(MainActivity.REFRESH_MODELS) == 1){
                    LOGGER.i("Refreshing models ... ");
                    Toast toast = Toast.makeText(this, "Refreshing models ...", Toast.LENGTH_SHORT);
                    toast.show();

                    modelPoses = server.getAllModels(this);
                }

                else {

                    LOGGER.i("Model pose id ontvangen ");

                    int modelId = (int) data.getExtras().get(MainActivity.EXTRA_MODEL_POSE);
                    LOGGER.i("#### IN mainactivity  model id: " + modelId);


                    // start UploadImageView
                    if (pictureFile != null) {
                        Intent intent = new Intent(this, UploadImageActivity.class);
                        intent.putExtra(MainActivity.EXTRA_IMAGE, pictureFile);
                        intent.putExtra(MainActivity.EXTRA_MODEL_POSE, modelId);
                        startActivity(intent);
                    } else {
                        LOGGER.i("Nog geen foto beschikbaar!!");
                        Toast toast = Toast.makeText(this, "No picture taken yet", Toast.LENGTH_SHORT);
                        toast.show();
                    }
                }

            }
        }


    }

    @Override
    public void onResume() {
        LOGGER.e("RESUMING MAINACt");

        if(poseImage != null){
            imageView.setImageBitmap(poseImage);
            butAddModel.setEnabled(true);

        }
        super.onResume();
    }


    public void viewModels(View view) {
        LOGGER.i("-----BROWSE MODELSS");
        // start new activity Choose Model Pose   (to server)
        Intent intent = new Intent(this, ChooseModelPose.class);
        intent.putExtra(MainActivity.MODEL_POSES, modelPoses);
        //startActivity(intent);
        this.startActivityForResult(intent, REQUEST_CODE_MODEL_POSE);
    }

    public void addModel(View view){
        LOGGER.i("--- AADDDD MODEL");

        if(pictureFile != null){
            server.uploadNewModel(pictureFile, this);
        }

    }

    public void displayFeedback(String mess){
        Toast toast = Toast.makeText(this, mess, Toast.LENGTH_LONG);
        toast.show();
    }

    // Lame Camera-view (not in app)
    // ma dus zonder OD en dus full quality!!
    // TODO
    public void startCameraView2(View view) {
    }
}
